// app/trainer/chat/[roomId]/page.tsx

import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatRoom } from "@/app/components/chat/ChatRoom";

type IParams = Promise<{ roomId: string }>;

export default async function TrainerChatRoomPage(props: { params: IParams }) {
  const session = await getSessionOrRedirect();
  const params = await props.params;
  const { roomId } = params;

  return (
    <ChatPageTemplate
      title="회원 채팅"
      userRole="TRAINER"
      showBackButton={true}
    >
      <ChatRoom roomId={roomId} userId={session.id} />
    </ChatPageTemplate>
  );
}
