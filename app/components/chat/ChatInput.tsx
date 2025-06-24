"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip } from "lucide-react";

interface IChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
}: IChatInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onSendMessage(trimmedMessage);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // 자동 높이 조절
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-3">
        {/* 첨부 버튼 (향후 파일 업로드용) */}
        <button
          type="button"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={disabled || isLoading}
        >
          <Paperclip size={20} />
        </button>

        {/* 메시지 입력 영역 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="
              w-full min-h-[40px] max-h-[120px] py-2 px-3 
              border border-gray-300 rounded-lg 
              resize-none outline-none
              focus:border-gray-900 focus:ring-1 focus:ring-gray-900
              disabled:bg-gray-50 disabled:text-gray-500
            "
            rows={1}
          />
        </div>

        {/* 전송 버튼 */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || isLoading || disabled}
          className="
            flex-shrink-0 p-2 
            bg-gray-900 text-white rounded-lg
            hover:bg-gray-800 transition-colors
            disabled:bg-gray-300 disabled:cursor-not-allowed
          "
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
