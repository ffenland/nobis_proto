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

async function checkDatabaseStatus() {
  console.log('=== Supabase Database Status Check ===\n');
  
  try {
    // 1. RLS 상태 확인
    console.log('1. Checking RLS status for chat tables...');
    try {
      const { data: rlsCheck, error: rlsError } = await supabase.rpc('check_rls_status', {
        tables: ['ChatRoom', 'Message', 'MessageRead']
      });
      
      if (rlsError) {
        console.log('RLS check not available (custom RPC may not exist)');
      } else if (rlsCheck) {
        console.log('RLS Status:', rlsCheck);
      }
    } catch (e) {
      console.log('RLS check skipped');
    }
    
    // 2. 테이블 존재 여부 확인
    console.log('\n2. Checking if tables exist...');
    
    const { data: chatRooms, error: chatRoomError } = await supabase
      .from('ChatRoom')
      .select('id')
      .limit(1);
    
    const { data: messages, error: messageError } = await supabase
      .from('Message')
      .select('id')
      .limit(1);
    
    const { data: messageReads, error: messageReadError } = await supabase
      .from('MessageRead')
      .select('id')
      .limit(1);
    
    console.log('- ChatRoom table:', chatRoomError ? '❌ Error' : '✅ Accessible');
    console.log('- Message table:', messageError ? '❌ Error' : '✅ Accessible');
    console.log('- MessageRead table:', messageReadError ? '❌ Error' : '✅ Accessible');
    
    // 3. 샘플 데이터 확인
    console.log('\n3. Sample data check...');
    
    const { data: sampleRoom, error: sampleRoomError } = await supabase
      .from('ChatRoom')
      .select('id, userOneId, userTwoId, createdAt')
      .limit(1)
      .single();
    
    if (sampleRoom && !sampleRoomError) {
      console.log('Sample ChatRoom:', {
        id: sampleRoom.id,
        created: new Date(sampleRoom.createdAt).toLocaleString()
      });
      
      // 해당 방의 최근 메시지 확인
      const { data: recentMessages, error: msgError } = await supabase
        .from('Message')
        .select('id, content, senderId, createdAt')
        .eq('roomId', sampleRoom.id)
        .order('createdAt', { ascending: false })
        .limit(3);
      
      if (recentMessages && !msgError) {
        console.log(`\nRecent messages in room ${sampleRoom.id}:`);
        recentMessages.forEach(msg => {
          console.log(`- "${msg.content}" (${new Date(msg.createdAt).toLocaleString()})`);
        });
      }
    }
    
    // 4. Realtime 채널 테스트
    console.log('\n4. Testing Realtime channel creation...');
    
    const testChannel = supabase.channel('test-channel', {
      config: {
        broadcast: { self: true },
        presence: { key: 'test-user' }
      }
    });
    
    const subscribePromise = new Promise((resolve) => {
      testChannel.subscribe((status) => {
        console.log('Channel subscribe status:', status);
        resolve(status);
      });
    });
    
    const status = await subscribePromise;
    console.log('Final status:', status);
    
    // 채널 정리
    supabase.removeChannel(testChannel);
    
    // 5. 브로드캐스트 테스트
    console.log('\n5. Testing broadcast capability...');
    
    const broadcastChannel = supabase.channel('broadcast-test', {
      config: { broadcast: { self: true } }
    });
    
    let broadcastReceived = false;
    
    broadcastChannel
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('Broadcast received:', payload);
        broadcastReceived = true;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Broadcasting test message...');
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Hello from test!' }
          });
        }
      });
    
    // 브로드캐스트 수신 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (broadcastReceived) {
      console.log('✅ Broadcast is working!');
    } else {
      console.log('❌ Broadcast not received');
    }
    
    // 채널 정리
    supabase.removeChannel(broadcastChannel);
    
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('Error during check:', error);
  }
}

// 실행
checkDatabaseStatus()
  .catch(console.error)
  .finally(() => process.exit(0));