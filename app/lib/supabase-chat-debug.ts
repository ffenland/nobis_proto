// 디버깅용 - 필터 없이 모든 Message 이벤트 수신
import { supabase } from "@/app/lib/supabase";

export function debugSubscribeToAllMessages() {
  console.log("[Debug] Setting up subscription to ALL Message events (no filter)");
  
  const channel = supabase
    .channel('debug-messages')
    .on(
      "postgres_changes",
      {
        event: "*", // 모든 이벤트 (INSERT, UPDATE, DELETE)
        schema: "public",
        table: "Message",
        // filter 없음 - 모든 메시지 이벤트 수신
      },
      (payload) => {
        console.log("[Debug] Message event received:", payload);
        console.log("[Debug] Event type:", payload.eventType);
        console.log("[Debug] Table:", payload.table);
        console.log("[Debug] Schema:", payload.schema);
        console.log("[Debug] New data:", payload.new);
        console.log("[Debug] Old data:", payload.old);
      }
    )
    .subscribe((status, err) => {
      console.log("[Debug] Channel state:", channel);
      if (err) {
        console.error("[Debug] Subscription error:", err);
      } else {
        console.log(`[Debug] Subscription status: ${status}`);
        if (status === "SUBSCRIBED") {
          console.log("[Debug] Ready to receive ALL Message events!");
        }
      }
    });
    
  return {
    unsubscribe: () => {
      console.log("[Debug] Unsubscribing from debug channel");
      supabase.removeChannel(channel);
    }
  };
}

// 특정 테이블의 Realtime 상태 확인
export async function checkRealtimeStatus() {
  console.log("[Debug] Checking Realtime status...");
  
  // Realtime 객체 확인
  const realtime = (supabase as any).realtime;
  console.log("[Debug] Realtime object exists:", !!realtime);
  
  if (realtime) {
    // 연결 상태 확인
    console.log("[Debug] Realtime isConnected:", realtime.isConnected());
    console.log("[Debug] Realtime channels:", realtime.channels);
    
    // 연결이 안 되어 있으면 수동 연결
    if (!realtime.isConnected()) {
      console.log("[Debug] Attempting to connect to Realtime...");
      realtime.connect();
      
      // 연결 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("[Debug] After connection attempt:", realtime.isConnected());
    }
    
    // WebSocket 상태 확인
    const ws = realtime.conn;
    if (ws) {
      console.log("[Debug] WebSocket readyState:", ws.readyState);
      console.log("[Debug] WebSocket url:", ws.url);
    }
  }
  
  // 현재 활성 채널 확인
  const channels = (supabase as any).realtime?.channels;
  if (channels) {
    console.log("[Debug] Active channels:", Object.keys(channels));
  }
}