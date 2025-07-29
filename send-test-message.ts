import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env 파일 로드
config({ path: '.env' });

// 환경변수 확장
const DATABASE_USERNAME = process.env.DATABASE_USERNAME!;
const supabaseUrl = `https://${DATABASE_USERNAME}.supabase.co`;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sendTestMessage() {
  console.log('=== Sending Test Message ===\n');
  
  // 1. 먼저 ChatRoom 찾기
  const { data: rooms, error: roomError } = await supabase
    .from('ChatRoom')
    .select('id, userOneId, userTwoId')
    .limit(1);
    
  if (roomError || !rooms || rooms.length === 0) {
    console.error('No chat rooms found:', roomError);
    return;
  }
  
  const testRoom = rooms[0];
  console.log('Using room:', testRoom.id);
  console.log('Sender will be:', testRoom.userOneId);
  
  // 2. 메시지 전송
  const testMessage = {
    roomId: testRoom.id,
    senderId: testRoom.userOneId,
    content: `Test message from script - ${new Date().toLocaleTimeString()}`,
    messageType: 'TEXT',
    isRead: false
  };
  
  console.log('\nSending message:', testMessage);
  
  const { data: insertedMessage, error: insertError } = await supabase
    .from('Message')
    .insert(testMessage)
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Failed to send message:', insertError);
  } else {
    console.log('✅ Message sent successfully!');
    console.log('Message ID:', insertedMessage.id);
    console.log('Created at:', insertedMessage.createdAt);
  }
}

// 실행
sendTestMessage().catch(console.error).then(() => process.exit(0));