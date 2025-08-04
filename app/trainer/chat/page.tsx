// app/trainer/chat/page.tsx
import React from "react";
import { ChatPageTemplate } from "@/app/components/chat/ChatPageTemplate";
import { ChatList } from "@/app/components/chat/originalchatlist";

export default function TrainerChatListPage() {
  return (
    <ChatPageTemplate
      title="회원 채팅"
      userRole="TRAINER"
      showBackButton={false}
    >
      <div className="p-4">
        <ChatList userRole="TRAINER" />
      </div>
    </ChatPageTemplate>
  );
}
