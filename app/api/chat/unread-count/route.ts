// app/api/chat/unread-count/route.ts
import { NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ChatService } from "@/app/lib/services/chat.service";

// 총 안읽은 메시지 수 조회
export async function GET() {
  try {
    const session = await getSessionOrRedirect();
    const chatService = ChatService.getInstance();

    const result = await chatService.getTotalUnreadCount(session.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch unread count",
      },
      { status: 500 }
    );
  }
}
