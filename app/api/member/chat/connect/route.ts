// app/api/member/chat/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { ChatService } from "@/app/lib/services/chat.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function POST(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MEMBER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { opponentId } = body;

    if (!opponentId) {
      return NextResponse.json(
        { error: "상대방 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const chatService = ChatService.getInstance();
    const result = await chatService.connectToChatRoom(sessionOrResponse.id, {
      opponentUserId: opponentId,
      opponentRole: "TRAINER",
    });

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_CHAT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "connectToChatRoom",
      },
      tags: ["api", "member", "chat"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
