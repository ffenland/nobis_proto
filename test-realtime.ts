// Supabase Realtime 테스트 스크립트
// 이 스크립트로 Realtime이 작동하는지 확인합니다.

import { createClient } from '@supabase/supabase-js';
import { supabase } from './app/lib/supabase';

async function testRealtime() {
  console.log('=== Supabase Realtime Test ===');
  
  // 1. 가장 단순한 형태로 구독 테스트
  const channel = supabase
    .channel('test-all-messages')
    .on(
      'postgres_changes',
      {
        event: '*', // 모든 이벤트
        schema: 'public',
        table: 'Message',
      },
      (payload) => {
        console.log('[TEST] Received event:', payload);
      }
    );

  // 구독 시작
  const subscription = channel.subscribe((status, err) => {
    if (err) {
      console.error('[TEST] Subscription error:', err);
    } else {
      console.log('[TEST] Subscription status:', status);
    }
  });

  console.log('[TEST] Waiting for events... (Press Ctrl+C to exit)');
  
  // 프로세스가 종료되지 않도록 유지
  process.stdin.resume();
}

// 다른 방법: 직접 SQL로 확인
async function checkRealtimePublication() {
  console.log('\n=== Checking Realtime Publication ===');
  
  const { data, error } = await supabase.rpc('get_publication_tables', {
    publication_name: 'supabase_realtime'
  });
  
  if (error) {
    console.error('[TEST] Error checking publication:', error);
  } else {
    console.log('[TEST] Tables in supabase_realtime publication:', data);
  }
}

// 테이블명 확인
async function checkTableName() {
  console.log('\n=== Checking Table Names ===');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%essage%');
    
  if (error) {
    console.error('[TEST] Error checking tables:', error);
  } else {
    console.log('[TEST] Tables matching "message":', data);
  }
}

// 실행
testRealtime();