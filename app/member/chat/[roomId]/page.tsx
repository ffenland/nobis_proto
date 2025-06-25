// app/member/chat/[roomId]/page.tsx

import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatRoom } from "@/app/components/chat/ChatRoom";

type IParams = Promise<{ roomId: string }>;

export default async function MemberChatRoomPage(props: { params: IParams }) {
  const session = await getSessionOrRedirect();
  const params = await props.params;
  const { roomId } = params;

  return (
    <ChatPageTemplate title="채팅" userRole="MEMBER" showBackButton={true}>
      <ChatRoom roomId={roomId} userId={session.id} />
    </ChatPageTemplate>
  );
}
