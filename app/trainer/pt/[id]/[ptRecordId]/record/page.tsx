// app/trainer/pt/[id]/[ptRecordId]/record/page.tsx
import { notFound } from "next/navigation";
import {
  getPtRecordInfoAction,
  checkRecordTimePermissionAction,
} from "../actions";
import RecordForm from "./RecordForm";

interface PtRecordPageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

export default async function PtRecordPage({ params }: PtRecordPageProps) {
  const resolvedParams = await params;
  const { id: ptId, ptRecordId } = resolvedParams;

  try {
    // 시간 권한 체크
    const timePermission = await checkRecordTimePermissionAction(ptRecordId);
    
    if (!timePermission.canRecord) {
      const startHour = Math.floor(timePermission.scheduleStart.getHours());
      const startMinute = timePermission.scheduleStart.getMinutes();
      const endHour = Math.floor(timePermission.scheduleEnd.getHours());
      const endMinute = timePermission.scheduleEnd.getMinutes();
      
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              운동 기록 가능 시간이 아닙니다
            </h2>
            <p className="text-yellow-700 mb-4">
              운동 기록은 수업 시작 30분 전부터 수업 종료 1시간 후까지만 가능합니다.
            </p>
            <p className="text-sm text-yellow-600">
              수업 시간: {startHour}:{String(startMinute).padStart(2, "0")} - {endHour}:{String(endMinute).padStart(2, "0")}
            </p>
            <a
              href={`/trainer/pt/${ptId}/${ptRecordId}`}
              className="inline-flex items-center px-4 py-2 mt-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              PT 기록으로 돌아가기
            </a>
          </div>
        </div>
      );
    }

    // PT 기록 정보 조회
    const ptRecordInfo = await getPtRecordInfoAction(ptRecordId);

    if (!ptRecordInfo) {
      notFound();
    }

    // 필수 데이터 검증
    if (
      !ptRecordInfo.pt.member ||
      !ptRecordInfo.pt.trainer ||
      !ptRecordInfo.pt.trainer.fitnessCenter
    ) {
      notFound();
    }

    return (
      <RecordForm
        ptId={ptId}
        ptRecordId={ptRecordId}
        ptRecordInfo={ptRecordInfo}
      />
    );

  } catch (error) {
    console.error("PT 기록 조회 실패:", error);
    notFound();
  }
}