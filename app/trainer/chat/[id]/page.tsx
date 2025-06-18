import { ChatRoom } from "@/app/components/chat/chatRoom";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getChatRoomPtInfo } from "@/app/trainer/chat/[id]/actions";
import Link from "next/link";

type Params = Promise<{ id: string }>;

export default async function TrainerChatPage(props: { params: Params }) {
  const params = await props.params;
  const session = await getSessionOrRedirect();
  const { id: roomId } = params;
  const { id: userId } = session;
  const ptInfo = await getChatRoomPtInfo(roomId, userId);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="flex flex-col w-full h-full max-w-[480px] mx-auto bg-white rounded-2xl shadow-xl border border-gray-200">
        {ptInfo ? (
          <Link href={`/trainer/pt/${ptInfo.id}`}>
            <div className="PTINFO flex gap-4 justify-between px-4 w-full mb-2 py-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">PT</span>
                <span className="text-sm font-bold">{ptInfo.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">수업상태</span>
                <span className="text-sm font-bold">{ptInfo.state}</span>
              </div>
            </div>
          </Link>
        ) : null}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ChatRoom roomId={roomId} userId={userId} />
        </div>
      </div>
    </div>
  );
}
