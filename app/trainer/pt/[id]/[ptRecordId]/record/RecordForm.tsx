"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import FreeRecord from "../edit/components/FreeRecord";
import MachineRecord from "../edit/components/MachineRecord";
import StretchingRecord from "../edit/components/StretchingRecord";
import { Button } from "@/app/components/ui/Button";
import { ChevronLeft, Clock, User, Edit, Trash2 } from "lucide-react";
import type { 
  TPtRecordInfo
} from "../actions";
import type {
  IMachine,
  IEquipment,
  IPtRecordItem,
} from "@/app/lib/services/pt-record.service";
import { EquipmentCategory } from "@prisma/client";

interface RecordFormProps {
  ptId: string;
  ptRecordId: string;
  ptRecordInfo: TPtRecordInfo;
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

export default function RecordForm({ 
  ptId, 
  ptRecordId, 
  ptRecordInfo
}: RecordFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<
    "machine" | "free" | "stretching" | null
  >(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const centerId = ptRecordInfo.pt.trainer?.fitnessCenter?.id;

  // PT 기록 아이템 목록 조회
  const {
    data: ptRecordItemsData,
    mutate: mutateRecordItems,
  } = useSWR<{ items: IPtRecordItem[] }>(
    `/api/trainer/pt-records/${ptRecordId}/items`,
    fetcher
  );

  // 머신 목록 조회
  const { data: machineList } = useSWR<IMachine[]>(
    centerId ? `/api/trainer/machines?centerId=${centerId}` : null,
    fetcher
  );

  // 웨이트 기구 목록 조회
  const { data: weightEquipmentList } = useSWR<IEquipment[]>(
    centerId ? `/api/trainer/equipment?centerId=${centerId}&category=${EquipmentCategory.WEIGHT}` : null,
    fetcher
  );

  // 모든 기구 목록 조회
  const { data: allEquipmentList } = useSWR<IEquipment[]>(
    centerId ? `/api/trainer/equipment?centerId=${centerId}` : null,
    fetcher
  );

  // 운동 기록 완료 후 콜백
  const handleRecordComplete = async () => {
    try {
      await mutateRecordItems();
      setSelectedType(null);
    } catch (error) {
      console.error("기록 업데이트 실패:", error);
    }
  };

  // 운동 기록 삭제 핸들러
  const handleDeleteItem = async (itemId: string) => {
    setIsDeleting(itemId);
    try {
      const response = await fetch(
        `/api/trainer/pt-records/${ptRecordId}/items/${itemId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "삭제 실패");
      }

      // 성공 시 목록 새로고침
      await mutateRecordItems();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("운동 기록 삭제 실패:", error);
      alert("운동 기록 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(null);
    }
  };

  // 운동 타입별 제목 생성
  const getRecordTitle = (item: IPtRecordItem) => {
    switch (item.type) {
      case "MACHINE":
        const machineRecord = item.machineSetRecords[0];
        return (
          machineRecord?.settingValues?.[0]?.machineSetting?.machine?.title ||
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 - 모바일 최적화 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/trainer/pt/${ptId}/${ptRecordId}`}>
              <Button variant="ghost" size="sm" className="p-2">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">운동 기록</h1>
            <button
              onClick={() => {
                if (!isSubmitting) {
                  setIsSubmitting(true);
                  router.push(`/trainer/pt/${ptId}/${ptRecordId}`);
                }
              }}
              disabled={isSubmitting}
              className="text-sm text-green-600 font-medium disabled:opacity-50"
            >
              완료
            </button>
          </div>
        </div>
      </div>

      {/* 수업 정보 - 간단하게 표시 */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {ptRecordInfo.pt.member!.user.username}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {Math.floor(ptRecordInfo.ptSchedule.startTime / 100)}:
              {String(ptRecordInfo.ptSchedule.startTime % 100).padStart(2, "0")} - 
              {Math.floor(ptRecordInfo.ptSchedule.endTime / 100)}:
              {String(ptRecordInfo.ptSchedule.endTime % 100).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* 기존 기록 - 리스트형으로 간단하게 표시 */}
      {ptRecordItemsData && ptRecordItemsData.items.length > 0 && (
        <div className="bg-white mb-2">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">
              완료된 운동 ({ptRecordItemsData.items.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {ptRecordItemsData.items.map((item) => (
              <div key={item.id} className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {getRecordTitle(item)}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.type === "MACHINE" && `${item.machineSetRecords.length}세트`}
                      {item.type === "FREE" && `${item.freeSetRecords.length}세트`}
                      {item.type === "STRETCHING" && "완료"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/trainer/pt/${ptId}/${ptRecordId}/edit/${item.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => setShowDeleteConfirm(item.id)}
                      disabled={isDeleting === item.id}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 운동 기록 작성 */}
      <div className="px-4 pb-8">
        {/* 운동 타입 선택 */}
        {selectedType === null && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3">운동 추가</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedType("machine")}
                className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🏋️</div>
                  <div className="text-sm font-medium">머신</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedType("free")}
                className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-xl mb-1">💪</div>
                  <div className="text-sm font-medium">프리웨이트</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedType("stretching")}
                className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🧘</div>
                  <div className="text-sm font-medium">스트레칭</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 선택된 타입에 따른 기록 컴포넌트 */}
        {selectedType === "machine" && machineList && (
          <MachineRecord
            ptRecordId={ptRecordId}
            onComplete={handleRecordComplete}
            machineList={machineList}
          />
        )}

        {selectedType === "free" && weightEquipmentList && (
          <FreeRecord
            ptRecordId={ptRecordId}
            onComplete={handleRecordComplete}
            equipmentList={weightEquipmentList}
          />
        )}

        {selectedType === "stretching" && allEquipmentList && (
          <StretchingRecord
            ptRecordId={ptRecordId}
            onComplete={handleRecordComplete}
            equipmentList={allEquipmentList}
          />
        )}

        {/* 취소 버튼 */}
        {selectedType !== null && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setSelectedType(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-2">운동 기록 삭제</h3>
            <p className="text-gray-600 mb-4">
              이 운동 기록을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting === showDeleteConfirm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteItem(showDeleteConfirm)}
                disabled={isDeleting === showDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting === showDeleteConfirm ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}