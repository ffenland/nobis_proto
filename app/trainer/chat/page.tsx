import { PageSubtitle, PageTitle } from "@/app/components/base/page_text";
import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import Link from "next/link";

export default async function TrainerChatList() {
  const session = await getSessionOrRedirect();
  const userId = session.id;

  // 내가 참여자로 있는 모든 채팅방 조회 (최신 메시지 순)
  const chatRooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
  });

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="TITLE flex flex-col gap-2">
        <PageTitle text="채팅 목록" />
        <PageSubtitle text="내가 참여하고 있는 채팅방들이에요" />
      </div>
      <ul className="mt-6 space-y-3">
        {chatRooms.length === 0 ? (
          <li className="text-gray-400 text-center">채팅방이 없습니다.</li>
        ) : (
          chatRooms.map((room) => {
            // 상대방 정보 추출
            const other = room.participants.find(
              (p) => p.user.id !== userId
            )?.user;
            return (
              <li key={room.id}>
                <Link
                  href={`/trainer/chat/${room.id}`}
                  className="block p-4 rounded-lg shadow bg-white hover:bg-blue-50 transition"
                >
                  <div className="font-semibold text-base">
                    {other
                      ? `${other.username} (${
                          other.role === "TRAINER" ? "트레이너" : "회원"
                        })`
                      : "알 수 없음"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    최근 대화:{" "}
                    {room.messages[0]
                      ? `${room.messages[0].content.slice(0, 20)}${
                          room.messages[0].content.length > 20 ? "..." : ""
                        } · ${new Date(
                          room.messages[0].createdAt
                        ).toLocaleString()}`
                      : "없음"}
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
