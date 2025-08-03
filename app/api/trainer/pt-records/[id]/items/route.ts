import { NextRequest, NextResponse } from "next/server";
import { getPtRecordItemsService } from "@/app/lib/services/trainer/pt-record.service";
import { getSession } from "@/app/lib/session";
import { createAuditLog } from "@/app/lib/services/audit/pt-record-audit.service";
import { 
  getPtRecordItemDetailForAudit,
  createPtRecordItem,
  checkPtRecordItemPermission,
  checkPtRecordPermission
} from "@/app/lib/services/trainer/pt-record-item.service";

// PT Record Items 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const ptRecordItems = await getPtRecordItemsService(id);
    return NextResponse.json(ptRecordItems);
  } catch (error) {
    console.error("PT Record Items 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PT Record Item 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: ptRecordId } = await params;
    const body = await request.json();
    const { type, title, description, entry } = body;

    // PT Record와 권한 확인
    const ptRecord = await checkPtRecordPermission(ptRecordId, session.roleId!);

    if (!ptRecord) {
      return NextResponse.json(
        { error: "PT Record를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    // PT Record Item 생성
    const ptRecordItem = await createPtRecordItem({
      ptRecordId,
      type,
      title,
      description,
      entry: entry || 0,
    });

    // 생성된 아이템의 상세 정보 가져오기
    const createdData = await getPtRecordItemDetailForAudit(ptRecordItem.id);

    // 감사 로그 기록
    await createAuditLog({
      trainerId: session.roleId!,
      ptRecordId: ptRecordId,
      ptRecordItemId: ptRecordItem.id,
      action: 'CREATE_ITEM',
      actionDetails: {
        type,
        createdData,
      },
      scheduledTime: ptRecord.ptSchedule.date,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json(ptRecordItem);
  } catch (error) {
    console.error("PT Record Item 생성 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}