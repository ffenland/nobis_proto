import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env 파일 로드
config({ path: '.env' });

// 환경변수 확장
const DATABASE_USERNAME = process.env.DATABASE_USERNAME!;
const supabaseUrl = `https://${DATABASE_USERNAME}.supabase.co`;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRealtimeConfig() {
  console.log('=== Supabase Realtime Configuration Check ===\n');
  
  // 1. 연결 테스트
  console.log('1. Testing Supabase connection...');
  const { data: testData, error: testError } = await supabase
    .from('Message')
    .select('id')
    .limit(1);
    
  if (testError) {
    console.error('❌ Connection failed:', testError);
    return;
  }
  console.log('✅ Connection successful\n');

  // 2. 실시간 구독 테스트
  console.log('2. Testing Realtime subscription...');
  console.log('Setting up subscription for ALL Message table events...\n');
  
  const channel = supabase
    .channel('test-all-events')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Message',
      },
      (payload) => {
        console.log('\n🔔 REALTIME EVENT RECEIVED!');
        console.log('Event Type:', payload.eventType);
        console.log('Table:', payload.table);
        console.log('Schema:', payload.schema);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('----------------------------\n');
      }
    );

  channel.subscribe((status, err) => {
    if (err) {
      console.error('❌ Subscription error:', err);
    } else {
      console.log(`📡 Subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to Message table changes\n');
        console.log('Now waiting for events...');
        console.log('To test: Insert a new message in the Message table');
        console.log('Press Ctrl+C to exit\n');
      }
    }
  });

  // 3. 테이블 정보 확인을 위한 raw SQL 실행
  console.log('3. Checking table information...');
  
  // RPC 함수를 통해 테이블 정보 확인 (만약 있다면)
  try {
    // 먼저 ChatRoom 목록 확인
    const { data: rooms, error: roomError } = await supabase
      .from('ChatRoom')
      .select('id, userOneId, userTwoId')
      .limit(5);
      
    if (!roomError && rooms && rooms.length > 0) {
      console.log('\nFound ChatRooms:');
      rooms.forEach(room => {
        console.log(`- Room ID: ${room.id}`);
      });
      
      // 첫 번째 방의 메시지 확인
      const firstRoomId = rooms[0].id;
      const { data: messages, error: msgError } = await supabase
        .from('Message')
        .select('id, content, createdAt')
        .eq('roomId', firstRoomId)
        .order('createdAt', { ascending: false })
        .limit(3);
        
      if (!msgError && messages) {
        console.log(`\nRecent messages in room ${firstRoomId}:`);
        messages.forEach(msg => {
          console.log(`- ${msg.content} (${new Date(msg.createdAt).toLocaleString()})`);
        });
      }
    }
  } catch (e) {
    console.log('Could not fetch room/message data:', e);
  }

  // 프로세스 유지
  process.stdin.resume();
}

// 실행
checkRealtimeConfig().catch(console.error);

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n\nClosing connections...');
  process.exit(0);
});