// app/api/chat/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  ChatService,
  type ICreateChatRoomRequest,
} from "@/app/lib/services/chat.service";

// 채팅방 목록 조회
export async function GET() {
  try {
    const session = await getSessionOrRedirect();
    const chatService = ChatService.getInstance();

    const chatRooms = await chatService.getChatRooms(session.id);

    return NextResponse.json({
      success: true,
      data: chatRooms,
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch chat rooms",
      },
      { status: 500 }
    );
  }
}

// 새 채팅방 생성 또는 기존 채팅방 찾기
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const body: ICreateChatRoomRequest = await req.json();

    if (!body.otherUserId) {
      return NextResponse.json(
        { success: false, error: "Other user ID is required" },
        { status: 400 }
      );
    }

    const chatService = ChatService.getInstance();
    const result = await chatService.getOrCreateChatRoom(
      session.id,
      body.otherUserId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error creating chat room:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create chat room",
      },
      { status: 500 }
    );
  }
}
