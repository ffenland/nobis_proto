// app/api/chat/[roomId]/info/route.ts (NextJS 15 버전)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatService } from "@/app/lib/services/chat.service";

interface IRouteParams {
  params: Promise<{ roomId: string }>;
}

// 채팅방 정보 조회 (PT 정보 포함)
export async function GET(req: NextRequest, props: IRouteParams) {
  try {
    const session = await getSessionOrRedirect();
    const params = await props.params; // NextJS 15: params await 필요
    const { roomId } = params;

    const chatService = ChatService.getInstance();
    const roomInfo = await chatService.getChatRoomInfo(session.id, roomId);

    return NextResponse.json({
      success: true,
      data: roomInfo,
    });
  } catch (error) {
    console.error("Error fetching chat room info:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch chat room info",
      },
      { status: 500 }
    );
  }
}
