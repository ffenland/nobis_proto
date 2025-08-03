// app/api/trainer/machine-set-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createMachineSetRecords } from "@/app/lib/services/trainer/exercise-set-record.service";

// 머신 세트 기록 생성 (복수 세트를 한번에 처리)
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
    const { ptRecordId, machineName, machineSetRecords, details, entry } = body;

    // 서비스 함수 호출
    const result = await createMachineSetRecords({
      ptRecordId,
      machineName,
      details,
      entry,
      machineSetRecords,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("머신 세트 기록 생성 실패:", error);
    return NextResponse.json(
      { error: "머신 운동 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
