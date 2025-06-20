// app/api/trainer/machine-set-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 머신 세트 기록 생성 (복수 세트를 한번에 처리)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordId, machineId, machineName, machineSetRecords, details } =
      body;

    // 트랜잭션으로 모든 세트 기록을 한 번에 생성
    const result = await prisma.$transaction(async (tx) => {
      // PtRecordItem 생성
      const ptRecordItem = await tx.ptRecordItem.create({
        data: {
          ptRecordId,
          type: "MACHINE",
          title: machineName,
          description: details,
          entry: 0,
        },
      });

      // 각 세트별로 MachineSetRecord 생성
      const machineSetRecordsCreated = await Promise.all(
        machineSetRecords.map(async (setRecord: any) => {
          return tx.machineSetRecord.create({
            data: {
              reps: setRecord.reps,
              set: setRecord.set,
              settingValues: {
                connect: setRecord.settingValueIds.map((valueId: string) => ({
                  id: valueId,
                })),
              },
              ptRecordItem: {
                connect: {
                  id: ptRecordItem.id,
                },
              },
            },
          });
        })
      );

      return {
        ptRecordItem,
        machineSetRecords: machineSetRecordsCreated,
      };
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
