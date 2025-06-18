"use client";
import React, { useState, useEffect } from "react";
import {
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
} from "@chatscope/chat-ui-kit-react";
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
} from "@/app/lib/chat_supabase";
import type { ChatMessage } from "./chatMessage";

export function ChatRoom({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetchMessages(roomId).then(setMessages);
  }, [roomId]);

  useEffect(() => {
    const channel = subscribeToMessages(roomId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    await sendMessage(roomId, userId, text);
    setInput("");
  };

  return (
    <div className="h-full w-full max-w-[480px] mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 ">
      <ChatContainer>
        <ConversationHeader>
          <ConversationHeader.Content>PT 수업 채팅</ConversationHeader.Content>
        </ConversationHeader>
        <MessageList>
          {messages.map((msg) => {
            return (
              <Message
                key={msg.id}
                model={{
                  message: msg.content,
                  sentTime: new Date(msg.createdAt).toLocaleTimeString(),
                  sender: msg.senderId === userId ? "나" : "상대",
                  direction: msg.senderId === userId ? "outgoing" : "incoming",
                  position: "single",
                }}
              />
            );
          })}
        </MessageList>
        <MessageInput
          placeholder="메시지를 입력하세요"
          value={input}
          onChange={setInput}
          onSend={handleSend}
          attachButton={false}
        />
      </ChatContainer>
    </div>
  );
}
