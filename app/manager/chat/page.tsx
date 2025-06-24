// app/manager/chat/page.tsx
import React from "react";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatList } from "@/app/components/chat/ChatList";

export default function ManagerChatListPage() {
  return (
    <ChatPageTemplate
      title="소통 채팅"
      userRole="MANAGER"
      showBackButton={false}
    >
      <div className="p-4">
        <ChatList userRole="MANAGER" />
      </div>
    </ChatPageTemplate>
  );
}
