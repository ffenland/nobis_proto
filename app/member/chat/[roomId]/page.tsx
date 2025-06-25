// app/member/chat/[roomId]/page.tsx
import React from "react";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatRoom } from "@/app/components/chat/ChatRoom";

interface IPageProps {
  params: { roomId: string };
}

export default async function MemberChatRoomPage({ params }: IPageProps) {
  const session = await getSessionOrRedirect();
  const { roomId } = params;

  return (
    <ChatPageTemplate title="채팅" userRole="MEMBER" showBackButton={true}>
      <ChatRoom roomId={roomId} userId={session.id} />
    </ChatPageTemplate>
  );
}
