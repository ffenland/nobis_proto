import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { PtState } from "@prisma/client";

// PT Record Item 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    
    if (!type || !["free", "machine", "stretching"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    switch (type) {
      case "free": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const freeExerciseId = formData.get("freeExerciseId") as string;
        const setCount = parseInt(formData.get("setCount") as string);

        // PT Record Item 업데이트
        await prisma.ptRecordItem.update({
          where: { id: itemId },
          data: {
            title,
            description,
          },
        });

        // 기존 FreeSetRecord 삭제
        await prisma.freeSetRecord.deleteMany({
          where: { ptRecordItemId: itemId },
        });

        // 새로운 FreeSetRecord 생성
        const sets = [];
        for (let i = 0; i < setCount; i++) {
          const setNumber = parseInt(formData.get(`sets[${i}].set`) as string);
          const reps = parseInt(formData.get(`sets[${i}].reps`) as string);
          
          const equipmentIds = [];
          let j = 0;
          while (formData.has(`sets[${i}].equipments[${j}]`)) {
            equipmentIds.push(formData.get(`sets[${i}].equipments[${j}]`) as string);
            j++;
          }

          sets.push({
            ptRecordItemId: itemId,
            freeExerciseId,
            set: setNumber,
            reps,
            equipments: {
              connect: equipmentIds.map(id => ({ id })),
            },
          });
        }

        await prisma.freeSetRecord.createMany({
          data: sets.map(({ equipments, ...rest }) => rest),
        });

        // equipments 연결은 별도로 처리
        for (let i = 0; i < sets.length; i++) {
          const createdSets = await prisma.freeSetRecord.findMany({
            where: { 
              ptRecordItemId: itemId,
              set: sets[i].set
            },
          });
          
          if (createdSets[0] && sets[i].equipments.connect.length > 0) {
            await prisma.freeSetRecord.update({
              where: { id: createdSets[0].id },
              data: { equipments: sets[i].equipments },
            });
          }
        }

        break;
      }

      case "machine": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const setCount = parseInt(formData.get("setCount") as string);

        // PT Record Item 업데이트
        await prisma.ptRecordItem.update({
          where: { id: itemId },
          data: {
            title,
            description,
          },
        });

        // 기존 MachineSetRecord 삭제
        await prisma.machineSetRecord.deleteMany({
          where: { ptRecordItemId: itemId },
        });

        // 새로운 MachineSetRecord 생성
        for (let i = 0; i < setCount; i++) {
          const setNumber = parseInt(formData.get(`sets[${i}].set`) as string);
          const reps = parseInt(formData.get(`sets[${i}].reps`) as string);

          const machineSetRecord = await prisma.machineSetRecord.create({
            data: {
              ptRecordItemId: itemId,
              set: setNumber,
              reps,
            },
          });

          // SettingValue 생성
          let j = 0;
          while (formData.has(`sets[${i}].settings[${j}].settingValueId`)) {
            const settingValueId = formData.get(`sets[${i}].settings[${j}].settingValueId`) as string;
            const value = formData.get(`sets[${i}].settings[${j}].value`) as string;

            await prisma.settingValue.create({
              data: {
                machineSetRecordId: machineSetRecord.id,
                machineSettingId: settingValueId,
                value,
              },
            });
            j++;
          }
        }

        break;
      }

      case "stretching": {
        const exerciseId = formData.get("exerciseId") as string;
        const description = formData.get("description") as string;

        // 기존 StretchingExerciseRecord 삭제
        await prisma.stretchingExerciseRecord.deleteMany({
          where: { ptRecordItemId: itemId },
        });

        // Equipment IDs 수집
        const equipmentIds = [];
        let i = 0;
        while (formData.has(`equipments[${i}]`)) {
          equipmentIds.push(formData.get(`equipments[${i}]`) as string);
          i++;
        }

        // 새로운 StretchingExerciseRecord 생성
        await prisma.stretchingExerciseRecord.create({
          data: {
            ptRecordItemId: itemId,
            stretchingExerciseId: exerciseId,
            description,
            equipments: {
              connect: equipmentIds.map(id => ({ id })),
            },
          },
        });

        // PT Record Item의 description 업데이트
        await prisma.ptRecordItem.update({
          where: { id: itemId },
          data: { description },
        });

        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PT Record Item 수정 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PT Record Item 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: ptRecordId, itemId } = await params;

    // PT Record Item이 존재하고 해당 트레이너의 것인지 확인
    const ptRecordItem = await prisma.ptRecordItem.findFirst({
      where: {
        id: itemId,
        ptRecord: {
          id: ptRecordId,
          pt: {
            trainerId: session.roleId,
            state: {
              in: [PtState.CONFIRMED, PtState.FINISHED],
            },
          },
        },
      },
      include: {
        machineSetRecords: true,
        freeSetRecords: true,
        stretchingExerciseRecords: true,
        photos: true,
      },
    });

    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT Record Item을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 관련 레코드들을 삭제 (Cascade 설정이 없는 경우를 대비)
    // 1. Machine Set Records와 관련 Setting Values
    if (ptRecordItem.machineSetRecords.length > 0) {
      await prisma.settingValue.deleteMany({
        where: {
          machineSetRecordId: {
            in: ptRecordItem.machineSetRecords.map(record => record.id),
          },
        },
      });
      await prisma.machineSetRecord.deleteMany({
        where: { ptRecordItemId: itemId },
      });
    }

    // 2. Free Set Records (equipment 연결은 자동으로 해제됨)
    if (ptRecordItem.freeSetRecords.length > 0) {
      await prisma.freeSetRecord.deleteMany({
        where: { ptRecordItemId: itemId },
      });
    }

    // 3. Stretching Exercise Records (equipment 연결은 자동으로 해제됨)
    if (ptRecordItem.stretchingExerciseRecords.length > 0) {
      await prisma.stretchingExerciseRecord.deleteMany({
        where: { ptRecordItemId: itemId },
      });
    }

    // 4. 관련 사진들 (있는 경우)
    if (ptRecordItem.photos.length > 0) {
      await prisma.media.deleteMany({
        where: {
          ptRecordItemId: itemId,
        },
      });
    }

    // 5. PT Record Item 삭제
    await prisma.ptRecordItem.delete({
      where: { id: itemId },
    });

    // 6. 남은 아이템들의 entry 값 재정렬
    const remainingItems = await prisma.ptRecordItem.findMany({
      where: { ptRecordId },
      orderBy: { entry: 'asc' },
    });

    // entry 값을 0부터 순차적으로 재배열
    for (let i = 0; i < remainingItems.length; i++) {
      await prisma.ptRecordItem.update({
        where: { id: remainingItems[i].id },
        data: { entry: i },
      });
    }

    return NextResponse.json({ 
      success: true,
      message: "운동 기록이 성공적으로 삭제되었습니다."
    });

  } catch (error) {
    console.error("PT Record Item 삭제 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}