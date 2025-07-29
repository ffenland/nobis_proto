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

interface TestUser {
  email: string;
  password: string;
  userId?: string;
}

// 테스트 사용자 정보
const testUsers: TestUser[] = [
  { email: 'test1@example.com', password: 'testpass123' },
  { email: 'test2@example.com', password: 'testpass123' }
];

async function testBroadcastChat() {
  console.log('=== Broadcast Chat System Test ===\n');
  
  try {
    // 1. 테스트 사용자 로그인 또는 생성
    console.log('1. Setting up test users...');
    
    for (const user of testUsers) {
      // 로그인 시도
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (authError) {
        // 사용자가 없으면 생성
        console.log(`Creating user ${user.email}...`);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password
        });
        
        if (signUpError) {
          console.error(`Failed to create user ${user.email}:`, signUpError);
          continue;
        }
        
        user.userId = signUpData.user?.id;
      } else {
        user.userId = authData.user?.id;
      }
      
      console.log(`✅ User ${user.email} ready (ID: ${user.userId})`);
    }
    
    // 2. 채팅방 확인 또는 생성
    console.log('\n2. Setting up chat room...');
    
    const { data: existingRoom } = await supabase
      .from('ChatRoom')
      .select('*')
      .or(`userOneId.eq.${testUsers[0].userId},userTwoId.eq.${testUsers[0].userId}`)
      .or(`userOneId.eq.${testUsers[1].userId},userTwoId.eq.${testUsers[1].userId}`)
      .single();
    
    let roomId: string;
    
    if (existingRoom) {
      roomId = existingRoom.id;
      console.log(`Using existing room: ${roomId}`);
    } else {
      // 새 채팅방 생성
      const { data: newRoom, error: roomError } = await supabase
        .from('ChatRoom')
        .insert({
          userOneId: testUsers[0].userId,
          userTwoId: testUsers[1].userId
        })
        .select()
        .single();
      
      if (roomError) {
        console.error('Failed to create room:', roomError);
        return;
      }
      
      roomId = newRoom.id;
      console.log(`✅ Created new room: ${roomId}`);
    }
    
    // 3. Broadcast 채널 설정
    console.log('\n3. Setting up broadcast channels...');
    
    const channelName = `chat_room:${roomId}`;
    let messageReceived = false;
    
    // User 1의 구독 채널
    const channel1 = supabase.channel(`${channelName}-user1`, {
      config: {
        broadcast: { self: false },
        private: true
      }
    });
    
    channel1
      .on('broadcast', { event: 'broadcast' }, (payload) => {
        console.log('\n📨 User 1 received broadcast:', payload);
        messageReceived = true;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ User 1 subscribed to channel');
          
          // 인증 설정
          const { data: session } = await supabase.auth.getSession();
          if (session?.session) {
            await supabase.realtime.setAuth(session.session.access_token);
          }
        }
      });
    
    // 구독이 완료될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 메시지 전송 테스트 (DB 트리거를 통한 자동 브로드캐스트)
    console.log('\n4. Testing message broadcast via DB trigger...');
    
    const testMessage = {
      roomId: roomId,
      senderId: testUsers[0].userId,
      content: `Broadcast test message - ${new Date().toLocaleTimeString()}`,
      messageType: 'TEXT',
      isRead: false
    };
    
    console.log('Sending message:', testMessage.content);
    
    const { data: sentMessage, error: sendError } = await supabase
      .from('Message')
      .insert(testMessage)
      .select()
      .single();
    
    if (sendError) {
      console.error('❌ Failed to send message:', sendError);
    } else {
      console.log('✅ Message sent to database');
      console.log('Message ID:', sentMessage.id);
    }
    
    // 5. 브로드캐스트 수신 대기
    console.log('\n5. Waiting for broadcast (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (messageReceived) {
      console.log('\n✅ Broadcast system is working correctly!');
    } else {
      console.log('\n❌ No broadcast received. Possible issues:');
      console.log('- Database triggers not set up');
      console.log('- RLS policies blocking access');
      console.log('- Broadcast function not working');
    }
    
    // 6. 수동 브로드캐스트 테스트
    console.log('\n6. Testing manual broadcast...');
    
    await channel1.send({
      type: 'broadcast',
      event: 'broadcast',
      payload: {
        event: 'new_message',
        message: {
          id: 'manual-test-id',
          content: 'Manual broadcast test',
          senderId: testUsers[0].userId,
          roomId: roomId,
          messageType: 'TEXT',
          createdAt: new Date().toISOString(),
          isRead: false
        }
      }
    });
    
    console.log('Manual broadcast sent');
    
    // 7. 정리
    console.log('\n7. Cleaning up...');
    supabase.removeChannel(channel1);
    
    // 로그아웃
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  console.log('\n=== Test Complete ===');
}

// 실행
testBroadcastChat()
  .catch(console.error)
  .finally(() => process.exit(0));