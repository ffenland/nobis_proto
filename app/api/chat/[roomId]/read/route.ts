// app/api/chat/[roomId]/read/route.ts (NextJS 15 버전)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  ChatService,
  type IMarkAsReadRequest,
} from "@/app/lib/services/chat.service";

interface IRouteParams {
  params: Promise<{ roomId: string }>;
}

// 메시지 읽음 처리
export async function POST(req: NextRequest, props: IRouteParams) {
  try {
    const session = await getSessionOrRedirect();
    const params = await props.params; // NextJS 15: params await 필요
    const { roomId } = params;

    const request: IMarkAsReadRequest = { roomId };

    const chatService = ChatService.getInstance();
    const result = await chatService.markAsRead(session.id, request);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark messages as read",
      },
      { status: 500 }
    );
  }
}
