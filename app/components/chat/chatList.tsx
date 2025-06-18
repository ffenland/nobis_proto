import React from "react";
import { ChatRoom } from "./chatRoom";

interface ChatListProps {
  chatRooms: ChatRoom[];
  activeRoomId?: string;
  onSelect: (roomId: string) => void;
}

export default function ChatList({
  chatRooms,
  activeRoomId,
  onSelect,
}: ChatListProps) {
  // 최근 메시지 순으로 정렬 (lastMessageAt 기준 내림차순)
  const sortedRooms = [...chatRooms].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return (
    <div className="w-full max-w-xs bg-white rounded shadow divide-y divide-gray-200">
      {sortedRooms.length === 0 ? (
        <div className="p-4 text-center text-gray-400">채팅방이 없습니다.</div>
      ) : (
        sortedRooms.map((room) => (
          <button
            key={room.id}
            className={`w-full flex flex-col items-start p-4 text-left hover:bg-gray-100 focus:bg-gray-100 transition ${
              activeRoomId === room.id ? "bg-gray-100" : ""
            }`}
            onClick={() => onSelect(room.id)}
          >
            <div className="font-semibold text-gray-800 truncate">
              {room.title || `채팅방 (${room.id.slice(0, 6)})`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              최근 대화:{" "}
              {room.lastMessageAt
                ? new Date(room.lastMessageAt).toLocaleString()
                : "-"}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
