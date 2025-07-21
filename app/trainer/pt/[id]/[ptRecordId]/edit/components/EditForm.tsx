// app/trainer/pt/[id]/[ptRecordId]/edit/components/EditForm.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPtRecordDetailService,
  getPtRecordInfoService,
  IPtRecordDetail,
} from "@/app/lib/services/pt-record.service";
import { Button } from "@/app/components/ui/Button";
import { Edit } from "lucide-react";
import PtRecordWriter from "../PtRecordWriter";

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
            <div key={record.id} className="text-sm text-gray-600">
              {record.set}세트: {record.reps}회 -{" "}
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
            <div key={record.id} className="text-sm text-gray-600">
              {record.set}세트: {record.reps}회 -{" "}
              {record.equipments
                .map((eq) => `${eq.title} ${getEquipmentDisplayText(eq)}`)
                .join(", ")}
            </div>
          ));
        case "STRETCHING":
          return item.stretchingExerciseRecords.map((record) => (
            <div key={record.id} className="text-sm text-gray-600">
              {record.stretchingExercise.title}
              {record.equipments && record.equipments.length > 0 && (
                <span>
                  {" "}
                  - {record.equipments.map((eq) => eq.title).join(", ")}
                </span>
              )}
            </div>
          ));
        default:
          return (
            <div className="text-sm text-gray-600">{item.description}</div>
          );
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PT 기록 작성/편집</h1>
          <div className="mt-2 text-gray-600">
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
        {ptRecordDetail.items.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h2 className="text-xl font-semibold mb-4">완료된 운동 기록</h2>
            <div className="space-y-4">
              {ptRecordDetail.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border border-gray-200 rounded-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {item.type === "MACHINE" && "🏋️"}
                        {item.type === "FREE" && "💪"}
                        {item.type === "STRETCHING" && "🧘"}
                      </span>
                      <span className="font-medium text-gray-900">
                        {getRecordTitle(item)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {item.entry}번째 운동
                      </span>
                      <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit/${item.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          수정
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-1">{formatSetInfo(item)}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600 mt-2">
                      메모: {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PT 기록 작성 컴포넌트 */}
        <PtRecordWriter
          ptRecordId={ptRecordId}
          ptId={ptId}
          center={ptRecordInfo.pt.trainer!.fitnessCenter!}
        />
      </div>
    );
  } catch (error) {
    console.error("PT 기록 조회 실패:", error);
    notFound();
  }
}