// app/trainer/pt/[id]/ScheduleChangeComponents.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/app/components/ui/Modal";
import { Input, Textarea } from "@/app/components/ui/Input";
import { TimeRangeInput } from "@/app/components/ui/TimeInput";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
} from "lucide-react";
import { TPtRecord } from "./actions";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import { calculateEndTime, isValidTimeSlot } from "@/app/lib/utils/time.utils";
import { type ICheckExistingResult } from "@/app/lib/services/pt-schedule-change.service";

interface ScheduleChangeComponentsProps {
  ptRecords: TPtRecord[];
}

const ScheduleChangeComponents = ({
  ptRecords,
}: ScheduleChangeComponentsProps) => {
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TPtRecord | null>(null);
  const [existingRequest, setExistingRequest] =
    useState<ICheckExistingResult['existingRequest'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 폼 상태
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState(900); // 09:00 기본값
  const [reason, setReason] = useState("");

  // 수업 시간 (시간 단위) - PtProduct에서 가져와야 함
  const [classDuration, setClassDuration] = useState(1); // 기본 1시간

  // 일정 변경 가능한 수업만 필터링 (미래 수업)
  const changeableRecords = ptRecords.filter((record) => {
    const now = new Date();
    const classDate = new Date(record.ptSchedule.date);
    return classDate > now;
  });

  // Date 객체를 YYYY-MM-DD 형식으로 변환
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 수업 시간 정보 가져오기
  useEffect(() => {
    if (selectedRecord) {
      // TODO: PtProduct에서 실제 수업 시간 가져오기
      // const duration = selectedRecord.ptSchedule.ptProduct?.durationHours || 1;
      // setClassDuration(duration);

      // 현재는 시작시간과 종료시간으로 계산
      const startTime = selectedRecord.ptSchedule.startTime;
      const endTime = selectedRecord.ptSchedule.endTime;
      const durationMinutes = (() => {
        const startHour = Math.floor(startTime / 100);
        const startMin = startTime % 100;
        const endHour = Math.floor(endTime / 100);
        const endMin = endTime % 100;

        const startTotalMin = startHour * 60 + startMin;
        const endTotalMin = endHour * 60 + endMin;

        return endTotalMin - startTotalMin;
      })();

      setClassDuration(durationMinutes / 60); // 시간 단위로 변환
    }
  }, [selectedRecord]);

  // 일정 변경 요청 버튼 클릭
  const handleScheduleChangeClick = async (record: TPtRecord) => {
    setSelectedRecord(record);
    setIsLoading(true);

    try {
      // 기존 요청 체크
      const response = await fetch(
        `/api/schedule-change/check-existing?ptRecordId=${record.id}`
      );
      const data = await response.json();

      if (data.hasExisting) {
        setExistingRequest(data.existingRequest);
        setShowExistingModal(true);
      } else {
        // 기본값 설정
        const scheduleDate = new Date(record.ptSchedule.date);
        setNewDate(formatDateForInput(scheduleDate));
        setNewStartTime(record.ptSchedule.startTime);
        setReason("");
        setShowChangeModal(true);
      }
    } catch (error) {
      console.error("기존 요청 체크 실패:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 일정 변경 요청 제출
  const handleSubmitChange = async (forceCancelExisting = false) => {
    if (!selectedRecord) return;

    // 시간 유효성 검증
    if (!isValidTimeSlot(newStartTime)) {
      alert("시간은 정시 또는 30분 단위로만 선택 가능합니다.");
      return;
    }

    const newEndTime = calculateEndTime(newStartTime, classDuration);

    setIsLoading(true);

    try {
      const requestData = {
        ptRecordId: selectedRecord.id,
        requestedDate: newDate,
        requestedStartTime: newStartTime,
        requestedEndTime: newEndTime,
        reason,
        forceCancelExisting,
      };

      const response = await fetch("/api/schedule-change/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok) {
        alert("일정 변경 요청이 성공적으로 전송되었습니다.");
        setShowChangeModal(false);
        setShowExistingModal(false);
        // 페이지 새로고침
        window.location.reload();
      } else {
        if (result.error === "EXISTING_REQUEST_FOUND") {
          alert("이미 처리 대기 중인 요청이 있습니다.");
        } else {
          alert(result.error || "요청 처리 중 오류가 발생했습니다.");
        }
      }
    } catch (error) {
      console.error("일정 변경 요청 실패:", error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 기존 요청 취소 후 새 요청
  const handleCancelAndSubmit = () => {
    if (!selectedRecord) return;

    setShowExistingModal(false);
    const scheduleDate = new Date(selectedRecord.ptSchedule.date);
    setNewDate(formatDateForInput(scheduleDate));
    setNewStartTime(selectedRecord.ptSchedule.startTime);
    setReason("");
    setShowChangeModal(true);
  };

  if (changeableRecords.length === 0) {
    return null; // 변경 가능한 수업이 없으면 아무것도 표시하지 않음
  }

  return (
    <>
      {/* 일정 변경 섹션 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Edit className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">일정 변경</h4>
        </div>
        <p className="text-sm text-blue-700 mb-4">
          예정된 수업의 일정을 변경할 수 있습니다. 변경 요청은 회원의 승인이
          필요합니다.
        </p>
        <div className="space-y-2">
          {changeableRecords.slice(0, 3).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-white rounded border"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">
                  {formatDateThisYear(new Date(record.ptSchedule.date))}
                </div>
                <div className="text-sm text-gray-600">
                  {formatTimeToString(
                    Math.floor(record.ptSchedule.startTime / 100),
                    record.ptSchedule.startTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(record.ptSchedule.endTime / 100),
                    record.ptSchedule.endTime % 100
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScheduleChangeClick(record)}
                disabled={isLoading}
              >
                일정 변경
              </Button>
            </div>
          ))}
          {changeableRecords.length > 3 && (
            <div className="text-sm text-blue-600 text-center">
              외 {changeableRecords.length - 3}개 수업
            </div>
          )}
        </div>
      </div>

      {/* 기존 요청 확인 모달 */}
      <Modal
        isOpen={showExistingModal}
        onClose={() => setShowExistingModal(false)}
      >
        <ModalHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            기존 요청이 있습니다
          </div>
        </ModalHeader>
        <ModalContent>
          {existingRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-sm font-medium text-orange-800 mb-2">
                  이미 처리 대기 중인 일정 변경 요청이 있습니다
                </div>
                <div className="space-y-2 text-sm text-orange-700">
                  <div>
                    <span className="font-medium">요청 일정:</span>{" "}
                    {formatDateThisYear(
                      new Date(existingRequest.requestedDate)
                    )}{" "}
                    {formatTimeToString(
                      Math.floor(existingRequest.requestedStartTime / 100),
                      existingRequest.requestedStartTime % 100
                    )}{" "}
                    -{" "}
                    {formatTimeToString(
                      Math.floor(existingRequest.requestedEndTime / 100),
                      existingRequest.requestedEndTime % 100
                    )}
                  </div>
                  <div>
                    <span className="font-medium">사유:</span>{" "}
                    {existingRequest.reason}
                  </div>
                  <div>
                    <span className="font-medium">요청일:</span>{" "}
                    {formatDateThisYear(new Date(existingRequest.createdAt))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                기존 요청을 취소하고 새로운 요청을 하시겠습니까?
              </p>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowExistingModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleCancelAndSubmit}>
            기존 요청 취소하고 새로 요청
          </Button>
        </ModalFooter>
      </Modal>

      {/* 일정 변경 요청 모달 */}
      <Modal isOpen={showChangeModal} onClose={() => setShowChangeModal(false)}>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            일정 변경 요청
          </div>
        </ModalHeader>
        <ModalContent>
          {selectedRecord && (
            <div className="space-y-6">
              {/* 현재 일정 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  현재 일정
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateThisYear(new Date(selectedRecord.ptSchedule.date))}{" "}
                  {formatTimeToString(
                    Math.floor(selectedRecord.ptSchedule.startTime / 100),
                    selectedRecord.ptSchedule.startTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(selectedRecord.ptSchedule.endTime / 100),
                    selectedRecord.ptSchedule.endTime % 100
                  )}
                  <span className="ml-2 text-gray-500">
                    ({classDuration}시간)
                  </span>
                </div>
              </div>

              {/* 새로운 일정 */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700">
                  새로운 일정
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    날짜
                  </label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <TimeRangeInput
                  startTime={newStartTime}
                  onStartTimeChange={setNewStartTime}
                  durationHours={classDuration}
                  openTime={600} // 06:00
                  closeTime={2200} // 22:00
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    변경 사유 <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="일정 변경이 필요한 사유를 입력해주세요"
                    rows={3}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">안내사항</span>
                </div>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• 일정 변경 요청은 회원의 승인이 필요합니다</li>
                  <li>• 요청 후 48시간 내에 응답하지 않으면 자동 만료됩니다</li>
                  <li>• 시간은 30분 단위로만 선택 가능합니다</li>
                  <li>• 수업 시간은 {classDuration}시간으로 고정됩니다</li>
                </ul>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowChangeModal(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSubmitChange(false)}
              disabled={!reason.trim() || isLoading}
            >
              {isLoading ? "요청 중..." : "변경 요청"}
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default ScheduleChangeComponents;
