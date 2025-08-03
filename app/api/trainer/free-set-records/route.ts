// app/api/trainer/free-set-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createFreeSetRecord, getFreeSetRecords } from "@/app/lib/services/trainer/exercise-set-record.service";

// 프리웨이트 세트 기록 생성
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
    const { ptRecordItemId, freeExerciseId, reps, set, equipmentIds } = body;

    // 서비스 함수 호출
    const freeSetRecord = await createFreeSetRecord({
      ptRecordItemId,
      freeExerciseId,
      reps,
      set,
      equipmentIds,
    });

    return NextResponse.json(freeSetRecord);
  } catch (error) {
    console.error("Free Set Record 생성 실패:", error);
    return NextResponse.json(
      { error: "프리웨이트 세트 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 프리웨이트 세트 기록 조회
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
    const freeSetRecords = await getFreeSetRecords(ptRecordItemId);

    return NextResponse.json(freeSetRecords);
  } catch (error) {
    console.error("Free Set Record 조회 실패:", error);
    return NextResponse.json(
      { error: "프리웨이트 세트 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
