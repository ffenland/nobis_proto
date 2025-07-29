-- Supabase Broadcast 기반 실시간 채팅 시스템 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- ==========================================
-- 1. RLS (Row Level Security) 활성화
-- ==========================================

-- ChatRoom 테이블 RLS 활성화
ALTER TABLE "ChatRoom" ENABLE ROW LEVEL SECURITY;

-- Message 테이블 RLS 활성화
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- MessageRead 테이블 RLS 활성화
ALTER TABLE "MessageRead" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. RLS 정책 설정
-- ==========================================

-- ChatRoom 정책
-- 사용자가 참여한 채팅방만 조회 가능
CREATE POLICY "Users can view their chat rooms" ON "ChatRoom"
  FOR SELECT
  USING (
    auth.uid()::text = "userOneId"::text OR 
    auth.uid()::text = "userTwoId"::text
  );

-- 사용자가 참여한 채팅방만 업데이트 가능 (lastMessageAt 업데이트용)
CREATE POLICY "Users can update their chat rooms" ON "ChatRoom"
  FOR UPDATE
  USING (
    auth.uid()::text = "userOneId"::text OR 
    auth.uid()::text = "userTwoId"::text
  );

-- Message 정책
-- 사용자가 참여한 채팅방의 메시지만 조회 가능
CREATE POLICY "Users can view messages in their rooms" ON "Message"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "ChatRoom"
      WHERE "ChatRoom"."id" = "Message"."roomId"
      AND (
        auth.uid()::text = "ChatRoom"."userOneId"::text OR 
        auth.uid()::text = "ChatRoom"."userTwoId"::text
      )
    )
  );

-- 사용자가 참여한 채팅방에만 메시지 작성 가능
CREATE POLICY "Users can send messages to their rooms" ON "Message"
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "senderId"::text AND
    EXISTS (
      SELECT 1 FROM "ChatRoom"
      WHERE "ChatRoom"."id" = "Message"."roomId"
      AND (
        auth.uid()::text = "ChatRoom"."userOneId"::text OR 
        auth.uid()::text = "ChatRoom"."userTwoId"::text
      )
    )
  );

-- MessageRead 정책
-- 사용자가 참여한 채팅방의 읽음 상태만 조회 가능
CREATE POLICY "Users can view read status" ON "MessageRead"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Message"
      JOIN "ChatRoom" ON "Message"."roomId" = "ChatRoom"."id"
      WHERE "Message"."id" = "MessageRead"."messageId"
      AND (
        auth.uid()::text = "ChatRoom"."userOneId"::text OR 
        auth.uid()::text = "ChatRoom"."userTwoId"::text
      )
    )
  );

-- 본인의 읽음 상태만 추가 가능
CREATE POLICY "Users can mark messages as read" ON "MessageRead"
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"::text AND
    EXISTS (
      SELECT 1 FROM "Message"
      JOIN "ChatRoom" ON "Message"."roomId" = "ChatRoom"."id"
      WHERE "Message"."id" = "MessageRead"."messageId"
      AND (
        auth.uid()::text = "ChatRoom"."userOneId"::text OR 
        auth.uid()::text = "ChatRoom"."userTwoId"::text
      )
    )
  );

-- ==========================================
-- 3. Broadcast 트리거 함수
-- ==========================================

-- 메시지 변경사항 브로드캐스트 함수
CREATE OR REPLACE FUNCTION handle_message_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
  room_data record;
BEGIN
  -- 채팅방 정보 조회
  SELECT * INTO room_data FROM "ChatRoom" WHERE "id" = COALESCE(NEW."roomId", OLD."roomId");
  
  -- 채널명 생성 (채팅방별로 구분)
  channel_name := 'chat_room:' || COALESCE(NEW."roomId", OLD."roomId");
  
  -- 페이로드 구성
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'event', 'new_message',
      'message', jsonb_build_object(
        'id', NEW."id",
        'roomId', NEW."roomId",
        'senderId', NEW."senderId",
        'content', NEW."content",
        'messageType', NEW."messageType",
        'createdAt', NEW."createdAt",
        'isRead', NEW."isRead"
      ),
      'roomData', jsonb_build_object(
        'userOneId', room_data."userOneId",
        'userTwoId', room_data."userTwoId"
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'event', 'message_updated',
      'message', jsonb_build_object(
        'id', NEW."id",
        'isRead', NEW."isRead"
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'event', 'message_deleted',
      'messageId', OLD."id"
    );
  END IF;
  
  -- 브로드캐스트 전송
  PERFORM realtime.broadcast_changes(channel_name, TG_OP, payload);
  
  -- ChatRoom의 lastMessageAt 업데이트 (새 메시지인 경우)
  IF TG_OP = 'INSERT' THEN
    UPDATE "ChatRoom" 
    SET "lastMessageAt" = NEW."createdAt"
    WHERE "id" = NEW."roomId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 읽음 상태 변경사항 브로드캐스트 함수
CREATE OR REPLACE FUNCTION handle_message_read_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
  message_data record;
BEGIN
  -- 메시지 정보 조회
  SELECT m.*, cr."userOneId", cr."userTwoId" 
  INTO message_data 
  FROM "Message" m
  JOIN "ChatRoom" cr ON m."roomId" = cr."id"
  WHERE m."id" = COALESCE(NEW."messageId", OLD."messageId");
  
  -- 채널명 생성 (메시지별로 구분)
  channel_name := 'message_read:' || message_data."roomId";
  
  -- 페이로드 구성
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'event', 'message_read',
      'messageId', NEW."messageId",
      'userId', NEW."userId",
      'readAt', NEW."readAt",
      'roomId', message_data."roomId"
    );
  END IF;
  
  -- 브로드캐스트 전송
  PERFORM realtime.broadcast_changes(channel_name, TG_OP, payload);
  
  -- Message 테이블의 isRead 상태 업데이트
  IF TG_OP = 'INSERT' AND message_data."senderId" != NEW."userId" THEN
    UPDATE "Message" 
    SET "isRead" = true
    WHERE "id" = NEW."messageId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. 트리거 생성
-- ==========================================

-- 기존 트리거 제거 (있을 경우)
DROP TRIGGER IF EXISTS message_changes_trigger ON "Message";
DROP TRIGGER IF EXISTS message_read_changes_trigger ON "MessageRead";

-- Message 테이블 트리거
CREATE TRIGGER message_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_changes();

-- MessageRead 테이블 트리거
CREATE TRIGGER message_read_changes_trigger
  AFTER INSERT ON "MessageRead"
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_read_changes();

-- ==========================================
-- 5. 인덱스 최적화
-- ==========================================

-- 성능 향상을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_message_roomid_createdat ON "Message"("roomId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_message_senderid ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS idx_messageread_messageid ON "MessageRead"("messageId");
CREATE INDEX IF NOT EXISTS idx_messageread_userid ON "MessageRead"("userId");

-- ==========================================
-- 6. 헬퍼 함수
-- ==========================================

-- 채팅방의 읽지 않은 메시지 수 계산 함수
CREATE OR REPLACE FUNCTION get_unread_count(p_room_id uuid, p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM "Message" m
    WHERE m."roomId" = p_room_id
    AND m."senderId" != p_user_id
    AND NOT EXISTS (
      SELECT 1 
      FROM "MessageRead" mr 
      WHERE mr."messageId" = m."id" 
      AND mr."userId" = p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. 테스트 데이터 확인
-- ==========================================

-- 현재 설정 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('ChatRoom', 'Message', 'MessageRead')
ORDER BY tablename, policyname;

-- 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('Message', 'MessageRead')
ORDER BY event_object_table, trigger_name;

-- ==========================================
-- 8. 권한 부여
-- ==========================================

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_unread_count(uuid, uuid) TO authenticated;

-- 완료 메시지
SELECT 'Broadcast 기반 실시간 채팅 시스템 설정 완료!' as status;