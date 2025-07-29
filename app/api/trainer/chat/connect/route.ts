// app/api/trainer/chat/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatService } from "@/app/lib/services/chat.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { opponentId } = body;

    if (!opponentId) {
      return NextResponse.json(
        { error: "상대방 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const chatService = ChatService.getInstance();
    const result = await chatService.connectToChatRoom(session.id, {
      opponentUserId: opponentId,
      opponentRole: "MEMBER",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("채팅방 연결 실패:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}