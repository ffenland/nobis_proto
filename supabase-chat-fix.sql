-- Broadcast 함수 호출 제거 및 수정된 트리거 함수

-- 기존 트리거 제거
DROP TRIGGER IF EXISTS message_changes_trigger ON "Message";
DROP TRIGGER IF EXISTS message_read_changes_trigger ON "MessageRead";

-- 기존 함수 제거
DROP FUNCTION IF EXISTS handle_message_changes();
DROP FUNCTION IF EXISTS handle_message_read_changes();

-- 수정된 메시지 변경사항 처리 함수 (broadcast 제거)
CREATE OR REPLACE FUNCTION handle_message_changes()
RETURNS trigger AS $$
BEGIN
  -- ChatRoom의 lastMessageAt 업데이트 (새 메시지인 경우)
  IF TG_OP = 'INSERT' THEN
    UPDATE "ChatRoom" 
    SET "lastMessageAt" = NEW."createdAt"
    WHERE "id" = NEW."roomId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 수정된 읽음 상태 변경사항 처리 함수 (broadcast 제거)
CREATE OR REPLACE FUNCTION handle_message_read_changes()
RETURNS trigger AS $$
DECLARE
  message_data record;
BEGIN
  -- 메시지 정보 조회
  SELECT m.* 
  INTO message_data 
  FROM "Message" m
  WHERE m."id" = NEW."messageId";
  
  -- Message 테이블의 isRead 상태 업데이트
  IF message_data."senderId" != NEW."userId" THEN
    UPDATE "Message" 
    SET "isRead" = true
    WHERE "id" = NEW."messageId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 재생성
CREATE TRIGGER message_changes_trigger
  AFTER INSERT ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_changes();

CREATE TRIGGER message_read_changes_trigger
  AFTER INSERT ON "MessageRead"
  FOR EACH ROW
  EXECUTE FUNCTION handle_message_read_changes();

-- 실시간 기능을 위한 Postgres Changes 방식 활성화
-- Supabase Dashboard > Database > Replication에서 다음 테이블 활성화 필요:
-- - Message
-- - MessageRead

SELECT 'Trigger functions fixed - broadcast calls removed' as status;