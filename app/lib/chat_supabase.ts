import { supabase } from "@/app/lib/supabase";
import type { ChatMessage } from "@/app/components/old_chat/chatMessage";

// 메시지 불러오기
export async function fetchMessages(roomId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("Message")
    .select("*")
    .eq("roomId", roomId)
    .order("createdAt", { ascending: true });
  return data || [];
}

// 메시지 전송
export async function sendMessage(
  roomId: string,
  senderId: string,
  content: string
) {
  await supabase
    .from("Message")
    .insert([{ roomId: roomId, senderId: senderId, content }]);
}

// 실시간 구독
export function subscribeToMessages(
  roomId: string,
  callback: (msg: ChatMessage) => void
) {
  const channel = supabase
    .channel("public:Message")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Message",
        filter: `roomId=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as ChatMessage);
      }
    )
    .subscribe();
  return channel;
}
