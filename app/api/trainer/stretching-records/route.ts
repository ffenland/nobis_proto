// app/api/trainer/stretching-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createStretchingRecord, getStretchingRecords } from "@/app/lib/services/trainer/exercise-set-record.service";

// 스트레칭 기록 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ptRecordItemId, stretchingExerciseId, description, equipmentIds } = body;

    // 서비스 함수 호출
    const stretchingRecord = await createStretchingRecord({
      ptRecordItemId,
      stretchingExerciseId,
      description,
      equipmentIds,
    });

    return NextResponse.json(stretchingRecord);
  } catch (error) {
    console.error("스트레칭 기록 생성 실패:", error);
    return NextResponse.json(
      { error: "스트레칭 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 스트레칭 기록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ptRecordItemId = searchParams.get("ptRecordItemId");

    if (!ptRecordItemId) {
      return NextResponse.json(
        { error: "ptRecordItemId가 필요합니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출
    const stretchingRecords = await getStretchingRecords(ptRecordItemId);

    return NextResponse.json(stretchingRecords);
  } catch (error) {
    console.error("스트레칭 기록 조회 실패:", error);
    return NextResponse.json(
      { error: "스트레칭 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
