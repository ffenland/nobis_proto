// app/api/trainer/schedule/off/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { deleteTrainerOffScheduleService } from "@/app/lib/services/trainer.service";

// DELETE: 오프 일정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "오프 일정 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 오프 일정 삭제
    const result = await deleteTrainerOffScheduleService(id, session.roleId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error("오프 일정 삭제 오류:", error);

    // 비즈니스 로직 오류
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "오프 일정 삭제에 실패했습니다.",
        details: "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}