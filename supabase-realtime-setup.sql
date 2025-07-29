-- Supabase Realtime 설정을 위한 SQL 스크립트
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. Message 테이블에 Realtime 활성화
-- Supabase Dashboard > Database > Replication에서 Message 테이블 활성화 필요
-- 또는 아래 SQL 실행:

-- Realtime publication 생성 (이미 있으면 스킵)
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;

-- Message 테이블을 publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- MessageRead 테이블도 추가 (읽음 상태 실시간 추적용)
ALTER PUBLICATION supabase_realtime ADD TABLE "MessageRead";

-- 2. RLS (Row Level Security) 정책 확인 및 설정
-- Message 테이블의 RLS가 활성화되어 있는지 확인
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- 채팅방 참여자만 메시지를 볼 수 있도록 정책 설정
CREATE POLICY "Users can view messages in their chat rooms" ON "Message"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "ChatRoom"
      WHERE "ChatRoom"."id" = "Message"."roomId"
      AND (
        "ChatRoom"."userOneId" = auth.uid()
        OR "ChatRoom"."userTwoId" = auth.uid()
      )
    )
  );

-- 채팅방 참여자만 메시지를 보낼 수 있도록 정책 설정
CREATE POLICY "Users can insert messages in their chat rooms" ON "Message"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ChatRoom"
      WHERE "ChatRoom"."id" = "Message"."roomId"
      AND (
        "ChatRoom"."userOneId" = auth.uid()
        OR "ChatRoom"."userTwoId" = auth.uid()
      )
    )
    AND "senderId" = auth.uid()
  );

-- 3. Broadcast 방식을 위한 트리거 함수 생성 (선택사항)
-- 이 트리거는 메시지가 삽입될 때 자동으로 broadcast 이벤트를 발송합니다
CREATE OR REPLACE FUNCTION broadcast_message_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  -- 채널명 생성
  channel_name := 'chat:' || NEW."roomId";
  
  -- 페이로드 구성
  payload := jsonb_build_object(
    'event', TG_OP,
    'payload', jsonb_build_object(
      'id', NEW."id",
      'roomId', NEW."roomId",
      'senderId', NEW."senderId",
      'content', NEW."content",
      'messageType', NEW."messageType",
      'createdAt', NEW."createdAt",
      'isRead', NEW."isRead"
    )
  );
  
  -- Supabase Edge Function 호출 또는 다른 broadcast 메커니즘 사용
  -- 참고: 이 부분은 실제 구현에 따라 다를 수 있습니다
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성 (선택사항)
CREATE TRIGGER message_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_message_changes();

-- 5. 인덱스 최적화 (성능 향상)
-- roomId로 메시지를 자주 조회하므로 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_message_roomid ON "Message"("roomId");
CREATE INDEX IF NOT EXISTS idx_message_roomid_createdat ON "Message"("roomId", "createdAt" DESC);

-- 6. ChatRoom 테이블의 RLS 정책
ALTER TABLE "ChatRoom" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat rooms" ON "ChatRoom"
  FOR SELECT
  USING (
    "userOneId" = auth.uid()
    OR "userTwoId" = auth.uid()
  );

-- 7. MessageRead 테이블의 RLS 정책
ALTER TABLE "MessageRead" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view read status" ON "MessageRead"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Message"
      JOIN "ChatRoom" ON "Message"."roomId" = "ChatRoom"."id"
      WHERE "Message"."id" = "MessageRead"."messageId"
      AND (
        "ChatRoom"."userOneId" = auth.uid()
        OR "ChatRoom"."userTwoId" = auth.uid()
      )
    )
  );

CREATE POLICY "Users can mark messages as read" ON "MessageRead"
  FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()
    AND EXISTS (
      SELECT 1 FROM "Message"
      JOIN "ChatRoom" ON "Message"."roomId" = "ChatRoom"."id"
      WHERE "Message"."id" = "MessageRead"."messageId"
      AND (
        "ChatRoom"."userOneId" = auth.uid()
        OR "ChatRoom"."userTwoId" = auth.uid()
      )
    )
  );

-- 8. Realtime 설정 확인
-- 다음 쿼리로 현재 publication에 포함된 테이블 확인
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- 9. 디버깅을 위한 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW chat_room_participants AS
SELECT 
  cr.id as room_id,
  cr."userOneId",
  cr."userTwoId",
  u1.username as user_one_name,
  u2.username as user_two_name
FROM 
  "ChatRoom" cr
  LEFT JOIN "User" u1 ON cr."userOneId" = u1.id
  LEFT JOIN "User" u2 ON cr."userTwoId" = u2.id;

-- 권한 부여
GRANT SELECT ON chat_room_participants TO authenticated;

-- 10. 테스트용 함수 (선택사항)
CREATE OR REPLACE FUNCTION test_realtime_message(
  p_room_id uuid,
  p_sender_id uuid,
  p_content text
)
RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO "Message" ("roomId", "senderId", "content", "messageType", "isRead")
  VALUES (p_room_id, p_sender_id, p_content, 'TEXT', false)
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용 예:
-- SELECT test_realtime_message('room-uuid-here', 'sender-uuid-here', 'Test message');