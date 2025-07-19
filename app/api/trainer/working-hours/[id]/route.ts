// app/api/trainer/working-hours/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { deleteTrainerWorkingHourService } from "@/app/lib/services/trainer.service";

// DELETE: 근무시간 삭제
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

    const workingHourId = params.id;

    if (!workingHourId) {
      return NextResponse.json(
        { error: "근무시간 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await deleteTrainerWorkingHourService(workingHourId, session.roleId);

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error("근무시간 삭제 오류:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "근무시간 삭제에 실패했습니다.",
        details: "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}