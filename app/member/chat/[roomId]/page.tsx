// app/member/chat/[roomId]/page.tsx

import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { ChatPageTemplate } from "@/app/components/chat/chatpage-template";
import { ChatRoom } from "@/app/components/chat/chat-room";

type IParams = Promise<{ roomId: string }>;

export default async function MemberChatRoomPage(props: { params: IParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const params = await props.params;
  const { roomId } = params;

  return (
    <ChatPageTemplate title="채팅" userRole="MEMBER" showBackButton={true}>
      <ChatRoom roomId={roomId} userId={session.id} />
    </ChatPageTemplate>
  );
}
