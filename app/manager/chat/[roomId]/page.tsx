// app/manager/chat/[roomId]/page.tsx
import React from "react";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatRoom } from "@/app/components/chat/ChatRoom";

interface IPageProps {
  params: { roomId: string };
}

export default async function ManagerChatRoomPage({ params }: IPageProps) {
  const session = await getSessionOrRedirect();
  const { roomId } = params;

  return (
    <ChatPageTemplate
      title="소통 채팅"
      userRole="MANAGER"
      showBackButton={true}
    >
      <div className="h-[calc(100vh-64px)]">
        <ChatRoom roomId={roomId} userId={session.id} />
      </div>
    </ChatPageTemplate>
  );
}
