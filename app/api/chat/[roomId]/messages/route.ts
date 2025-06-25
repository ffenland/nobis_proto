// app/api/chat/[roomId]/messages/route.ts (NextJS 15 버전)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  ChatService,
  type ISendMessageRequest,
  type IGetMessagesRequest,
} from "@/app/lib/services/chat.service";

interface IRouteParams {
  params: Promise<{ roomId: string }>;
}

// 메시지 조회
export async function GET(req: NextRequest, props: IRouteParams) {
  try {
    const session = await getSessionOrRedirect();
    const params = await props.params; // NextJS 15: params await 필요
    const { roomId } = params;
    const { searchParams } = new URL(req.url);

    const request: IGetMessagesRequest = {
      roomId,
      cursor: searchParams.get("cursor") || undefined,
      limit: parseInt(searchParams.get("limit") || "50"),
    };

    const chatService = ChatService.getInstance();
    const messages = await chatService.getMessages(session.id, request);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}

// 메시지 전송
export async function POST(req: NextRequest, props: IRouteParams) {
  try {
    const session = await getSessionOrRedirect();
    const params = await props.params; // NextJS 15: params await 필요
    const { roomId } = params;
    const body = await req.json();

    const request: ISendMessageRequest = {
      roomId,
      content: body.content,
    };

    if (!request.content || typeof request.content !== "string") {
      return NextResponse.json(
        { success: false, error: "Message content is required" },
        { status: 400 }
      );
    }

    const chatService = ChatService.getInstance();
    const message = await chatService.sendMessage(session.id, request);

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 }
    );
  }
}
