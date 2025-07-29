-- Supabase SQL Editor에서 직접 메시지 삽입 테스트
-- 실제 roomId와 senderId를 사용해주세요

-- 1. 현재 활성 채팅방 확인
SELECT 
  id as room_id,
  "userOneId",
  "userTwoId"
FROM "ChatRoom"
LIMIT 5;

-- 2. 직접 메시지 삽입 (위에서 확인한 roomId와 userId 사용)
INSERT INTO "Message" ("roomId", "senderId", "content", "messageType", "isRead")
VALUES (
  '2b19bc78-98d5-46d9-9f74-f543d1dce2e4'::uuid,  -- 실제 roomId로 변경
  '20a49995-4626-4652-9e5e-3998ad4d54a8'::uuid,  -- 실제 senderId로 변경
  'Test message from SQL Editor - ' || NOW()::text,
  'TEXT',
  false
)
RETURNING *;

-- 3. 삽입 후 확인
SELECT * FROM "Message" 
WHERE "roomId" = '2b19bc78-98d5-46d9-9f74-f543d1dce2e4'::uuid
ORDER BY "createdAt" DESC
LIMIT 5;