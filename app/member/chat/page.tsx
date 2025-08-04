// app/member/chat/page.tsx
import React from "react";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatList } from "@/app/components/chat/chat-list";

export default function MemberChatListPage() {
  return (
    <ChatPageTemplate title="채팅" userRole="MEMBER" showBackButton={false}>
      <div className="p-4">
        <ChatList userRole="MEMBER" />
      </div>
    </ChatPageTemplate>
  );
}
