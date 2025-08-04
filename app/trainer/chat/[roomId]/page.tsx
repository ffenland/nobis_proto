// app/trainer/chat/[roomId]/page.tsx

import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatRoom } from "@/app/components/chat/originalchatroom";

type IParams = Promise<{ roomId: string }>;

export default async function TrainerChatRoomPage(props: { params: IParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
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
