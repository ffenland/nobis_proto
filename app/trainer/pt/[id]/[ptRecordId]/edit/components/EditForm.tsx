// app/trainer/pt/[id]/[ptRecordId]/edit/components/EditForm.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getPtRecordDetailService,
  getPtRecordInfoService,
  IPtRecordDetail,
} from "@/app/lib/services/pt-record.service";
import { Button } from "@/app/components/ui/Button";
import { Edit, ChevronLeft } from "lucide-react";

interface EditFormProps {
  ptId: string;
  ptRecordId: string;
}

export default async function EditForm({ ptId, ptRecordId }: EditFormProps) {
  try {
    // PT 기록 정보와 상세 정보 병렬 조회
    const [ptRecordInfo, ptRecordDetail] = await Promise.all([
      getPtRecordInfoService(ptRecordId),
      getPtRecordDetailService(ptRecordId),
    ]);

    if (!ptRecordInfo || !ptRecordDetail) {
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

    // 기록이 없으면 record 페이지로 리다이렉트
    if (ptRecordDetail.items.length === 0) {
      redirect(`/trainer/pt/${ptId}/${ptRecordId}/record`);
    }

    // 기구 표시 텍스트 생성 헬퍼 함수
    const getEquipmentDisplayText = (equipment: {
      title: string;
      primaryValue: number | null;
      primaryUnit: string | null;
    }) => {
      const value = equipment.primaryValue;
      const unit = equipment.primaryUnit;

      if (value && unit) {
        return `${value}${unit}`;
      }
      return equipment.title;
    };

    // 운동 타입별 제목 생성
    const getRecordTitle = (item: IPtRecordDetail["items"][number]) => {
      switch (item.type) {
        case "MACHINE":
          const machineRecord = item.machineSetRecords[0];
          return (
            machineRecord?.settingValues[0]?.machineSetting?.machine?.title ||
            item.title ||
            "머신 운동"
          );
        case "FREE":
          return item.title || "프리웨이트";
        case "STRETCHING":
          const stretchingRecord = item.stretchingExerciseRecords[0];
          return (
            stretchingRecord?.stretchingExercise?.title ||
            item.title ||
            "스트레칭"
          );
        default:
          return item.title || "운동";
      }
    };

    // 세트 정보 포맷팅
    const formatSetInfo = (item: IPtRecordDetail["items"][number]) => {
      switch (item.type) {
        case "MACHINE":
          return item.machineSetRecords.map((record) => (
            <div key={record.id} className="text-gray-600">
              <span className="font-medium">{record.set}세트:</span> {record.reps}회
              <span className="text-gray-400 mx-1">•</span>
              {record.settingValues
                .map(
                  (sv) =>
                    `${sv.machineSetting.title} ${sv.value}${sv.machineSetting.unit}`
                )
                .join(", ")}
            </div>
          ));
        case "FREE":
          return item.freeSetRecords.map((record) => (
            <div key={record.id} className="text-gray-600">
              <span className="font-medium">{record.set}세트:</span> {record.reps}회
              <span className="text-gray-400 mx-1">•</span>
              {record.equipments
                .map((eq) => `${eq.title} ${getEquipmentDisplayText(eq)}`)
                .join(", ")}
            </div>
          ));
        case "STRETCHING":
          return item.stretchingExerciseRecords.map((record) => (
            <div key={record.id} className="text-gray-600">
              {record.stretchingExercise.title}
              {record.equipments && record.equipments.length > 0 && (
                <span>
                  <span className="text-gray-400 mx-1">•</span>
                  {record.equipments.map((eq) => eq.title).join(", ")}
                </span>
              )}
            </div>
          ));
        default:
          return (
            <div className="text-gray-600">{item.description}</div>
          );
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              PT 기록 수정
            </h1>
            <Link href={`/trainer/pt/${ptId}/${ptRecordId}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                돌아가기
              </Button>
            </Link>
          </div>
          <div className="text-gray-600">
            <p>
              회원: {ptRecordInfo.pt.member!.user.username} | 센터:{" "}
              {ptRecordInfo.pt.trainer!.fitnessCenter!.title}
            </p>
            <p>
              일시:{" "}
              {new Date(ptRecordInfo.ptSchedule.date).toLocaleDateString()} |{" "}
              시간: {Math.floor(ptRecordInfo.ptSchedule.startTime / 100)}:
              {String(ptRecordInfo.ptSchedule.startTime % 100).padStart(2, "0")}{" "}
              - {Math.floor(ptRecordInfo.ptSchedule.endTime / 100)}:
              {String(ptRecordInfo.ptSchedule.endTime % 100).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* 기존 기록 표시 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">운동 기록 목록</h2>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            {ptRecordDetail.items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">
                        {item.type === "MACHINE" && "🏋️"}
                        {item.type === "FREE" && "💪"}
                        {item.type === "STRETCHING" && "🧘"}
                      </span>
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {getRecordTitle(item)}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {item.entry}번째
                      </span>
                    </div>
                    <div className="space-y-0.5 text-xs">{formatSetInfo(item)}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        메모: {item.description}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/trainer/pt/${ptId}/${ptRecordId}/edit/${item.id}`}
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Edit className="w-3.5 h-3.5" />
                      <span className="ml-1 text-xs">수정</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 운동 추가 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-700 mb-2">
            운동을 추가하려면 실시간 기록 페이지를 이용하세요.
          </p>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/record`}>
            <Button variant="primary" size="sm">
              운동 기록 추가하기
            </Button>
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    console.error("PT 기록 조회 실패:", error);
    notFound();
  }
}
