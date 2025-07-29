-- Supabase Realtime 설정 확인 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 publication에 포함된 테이블 확인
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- 2. Message 테이블의 정확한 이름 확인 (대소문자 중요!)
SELECT 
  table_schema,
  table_name,
  table_type
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND (table_name ILIKE '%message%' OR table_name = 'Message');

-- 3. 현재 존재하는 모든 publication 확인
SELECT pubname FROM pg_publication;

-- 4. Message 테이블이 publication에 없다면 추가
-- 주의: 테이블명이 정확히 일치해야 함 (대소문자 구분)
DO $$
BEGIN
  -- publication이 없으면 생성
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Message 테이블 추가 (테이블명이 소문자일 경우)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message;
    RAISE NOTICE 'Added "message" table to publication';
  END IF;
  
  -- Message 테이블 추가 (테이블명이 대문자일 경우)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Message') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
    RAISE NOTICE 'Added "Message" table to publication';
  END IF;
  
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table already exists in publication';
END $$;

-- 5. 변경사항 확인
SELECT 
  'After changes:' as status,
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- 6. RLS (Row Level Security) 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM 
  pg_tables
WHERE 
  schemaname = 'public'
  AND tablename IN ('Message', 'message', 'ChatRoom', 'chatroom');

-- 7. 간단한 테스트 메시지 삽입 (roomId는 실제 값으로 변경 필요)
-- INSERT INTO "Message" ("roomId", "senderId", "content", "messageType")
-- VALUES ('2b19bc78-98d5-46d9-9f74-f543d1dce2e4'::uuid, '실제-유저-ID'::uuid, 'Realtime test message', 'TEXT');