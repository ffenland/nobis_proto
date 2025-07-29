-- Postgres Changes 방식을 위한 단순화된 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- ==========================================
-- 1. 기존 트리거와 함수 정리
-- ==========================================

-- 기존 트리거 제거
DROP TRIGGER IF EXISTS message_changes_trigger ON "Message";
DROP TRIGGER IF EXISTS message_read_changes_trigger ON "MessageRead";

-- 기존 함수 제거
DROP FUNCTION IF EXISTS handle_message_changes();
DROP FUNCTION IF EXISTS handle_message_read_changes();

-- ==========================================
-- 2. 단순화된 트리거 함수
-- ==========================================

-- 메시지 추가 시 lastMessageAt 업데이트
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE "ChatRoom" 
  SET "lastMessageAt" = NEW."createdAt"
  WHERE "id" = NEW."roomId";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 읽음 상태 추가 시 메시지 isRead 업데이트
CREATE OR REPLACE FUNCTION update_message_read_status()
RETURNS trigger AS $$
BEGIN
  -- 다른 사용자가 내 메시지를 읽었을 때만 업데이트
  UPDATE "Message" 
  SET "isRead" = true
  WHERE "id" = NEW."messageId"
    AND "senderId" != NEW."userId";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. 트리거 생성
-- ==========================================

CREATE TRIGGER update_last_message_trigger
  AFTER INSERT ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

CREATE TRIGGER update_read_status_trigger
  AFTER INSERT ON "MessageRead"
  FOR EACH ROW
  EXECUTE FUNCTION update_message_read_status();

-- ==========================================
-- 4. Realtime Publication 설정
-- ==========================================

-- Publication이 없으면 생성
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;

-- Message와 MessageRead 테이블을 publication에 추가
-- 에러가 나도 무시 (이미 추가되어 있을 수 있음)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "MessageRead";
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- ==========================================
-- 5. 현재 설정 확인
-- ==========================================

-- Publication에 포함된 테이블 확인
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- RLS 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM 
  pg_tables
WHERE 
  schemaname = 'public'
  AND tablename IN ('ChatRoom', 'Message', 'MessageRead');

SELECT 'Postgres Changes setup completed!' as status;