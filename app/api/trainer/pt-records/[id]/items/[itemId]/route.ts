import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createAuditLog } from "@/app/lib/services/audit/pt-record-audit.service";
import { 
  softDeletePtRecordItem, 
  getPtRecordItemDetailForAudit,
  reorderPtRecordItems,
  checkPtRecordItemPermission,
  updatePtRecordItemFree,
  updatePtRecordItemMachine,
  updatePtRecordItemStretching
} from "@/app/lib/services/trainer/pt-record-item.service";

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

    const { id: ptRecordId, itemId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    
    if (!type || !["free", "machine", "stretching"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 }
      );
    }

    // 권한 확인 및 PT 스케줄 정보 가져오기
    const ptRecordItem = await checkPtRecordItemPermission(itemId, session.roleId!);
    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT Record Item을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 수정 전 데이터 백업 (감사 로그용)
    const originalData = await getPtRecordItemDetailForAudit(itemId);

    const formData = await request.formData();

    switch (type) {
      case "free": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const freeExerciseId = formData.get("freeExerciseId") as string;
        const setCount = parseInt(formData.get("setCount") as string);

        // 세트 데이터 수집
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
            set: setNumber,
            reps,
            equipmentIds,
          });
        }

        // 서비스 함수 호출
        await updatePtRecordItemFree({
          itemId,
          title,
          description,
          freeExerciseId,
          sets,
        });

        break;
      }

      case "machine": {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const setCount = parseInt(formData.get("setCount") as string);

        // 세트 데이터 수집
        const sets = [];
        for (let i = 0; i < setCount; i++) {
          const setNumber = parseInt(formData.get(`sets[${i}].set`) as string);
          const reps = parseInt(formData.get(`sets[${i}].reps`) as string);

          // 세팅 데이터 수집
          const settings = [];
          let j = 0;
          while (formData.has(`sets[${i}].settings[${j}].settingValueId`)) {
            const machineSettingId = formData.get(`sets[${i}].settings[${j}].settingValueId`) as string;
            const value = formData.get(`sets[${i}].settings[${j}].value`) as string;
            
            settings.push({
              machineSettingId,
              value,
            });
            j++;
          }

          sets.push({
            set: setNumber,
            reps,
            settings,
          });
        }

        // 서비스 함수 호출
        await updatePtRecordItemMachine({
          itemId,
          title,
          description,
          sets,
        });

        break;
      }

      case "stretching": {
        const stretchingExerciseId = formData.get("exerciseId") as string;
        const description = formData.get("description") as string;

        // Equipment IDs 수집
        const equipmentIds = [];
        let i = 0;
        while (formData.has(`equipments[${i}]`)) {
          equipmentIds.push(formData.get(`equipments[${i}]`) as string);
          i++;
        }

        // 서비스 함수 호출
        await updatePtRecordItemStretching({
          itemId,
          stretchingExerciseId,
          description,
          equipmentIds,
        });

        break;
      }
    }

    // 수정 후 데이터 가져오기
    const updatedData = await getPtRecordItemDetailForAudit(itemId);

    // 감사 로그 기록
    await createAuditLog({
      trainerId: session.roleId!,
      ptRecordId: ptRecordId,
      ptRecordItemId: itemId,
      action: 'UPDATE_ITEM',
      actionDetails: {
        type,
        originalData,
        updatedData,
      },
      scheduledTime: ptRecordItem.ptRecord.ptSchedule.date,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PT Record Item 수정 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PT Record Item 삭제 (소프트 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.roleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: ptRecordId, itemId } = await params;

    // PT Record Item 권한 확인
    const ptRecordItem = await checkPtRecordItemPermission(itemId, session.roleId);

    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT Record Item을 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 삭제 전 상세 데이터 백업 (감사 로그용)
    const originalData = await getPtRecordItemDetailForAudit(itemId);

    // 소프트 삭제 실행
    const deletedItem = await softDeletePtRecordItem(itemId, session.roleId);

    // 남은 아이템들의 entry 값 재정렬
    await reorderPtRecordItems(ptRecordId);

    // 감사 로그 기록
    await createAuditLog({
      trainerId: session.roleId,
      ptRecordId: ptRecordId,
      ptRecordItemId: itemId,
      action: 'DELETE_ITEM',
      actionDetails: {
        originalData,
        deletedAt: deletedItem.deletedAt,
      },
      scheduledTime: ptRecordItem.ptRecord.ptSchedule.date,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

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