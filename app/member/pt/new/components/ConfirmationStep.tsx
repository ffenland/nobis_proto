// components/ptNew/ConfirmationStep.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Input";
import { ErrorMessage, Badge } from "@/app/components/ui/Loading";
import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
  IPtSchedule,
  IPreschedulePtResult,
} from "@/app/lib/services/pt-apply.service";
import {
  ISchedulePattern,
  convertRegularScheduleToSlots,
} from "@/app/lib/services/schedule.service";
import { formatTime, addThirtyMinutes } from "./schedule.utils";
import { formatDateWithWeekday } from "@/app/lib/utils/time.utils";
import LoadingOverlay from "./LoadingOverlay";

interface ConfirmationStepProps {
  selectedCenter: IFitnessCenters[number];
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  chosenSchedule: IDaySchedule;
  message: string;
  setMessage: (message: string) => void;
  prescheduleResult: IPreschedulePtResult;
  onGoBack: () => void; // 이전 단계로 돌아가기
}

const ConfirmationStep = ({
  selectedCenter,
  selectedPt,
  selectedTrainer,
  pattern,
  chosenSchedule,
  message,
  setMessage,
  prescheduleResult,
  onGoBack,
}: ConfirmationStepProps) => {
  const router = useRouter();
  const [isCanceling, setIsCanceling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);


  // 취소 핸들러 (서버에 삭제 요청 및 이전 단계로 돌아가기)
  const handleCancel = async () => {
    setIsCanceling(true);

    if (prescheduleResult) {
      try {
        await fetch(`/api/member/pt/${prescheduleResult.ptId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("PT 삭제 실패:", err);
      }
    }

    // 이전 단계로 돌아가기 (스케줄 설정 단계로)
    onGoBack();
  };

  // 최종 확인 핸들러 (PT 상세 페이지로 이동)
  const handleConfirm = async () => {
    if (!prescheduleResult) return;

    setIsConfirming(true);

    try {
      // 메시지가 있다면 PT에 업데이트
      if (message.trim()) {
        await fetch(`/api/member/pt/${prescheduleResult.ptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: message }),
        });
      }

      // PT 상세 페이지로 이동
      router.push(`/member/pt/${prescheduleResult.ptId}`);
    } catch (err) {
      console.error("PT 확정 실패:", err);
      // 에러가 발생해도 상세 페이지로 이동
      router.push(`/member/pt/${prescheduleResult.ptId}`);
    } finally {
      setIsConfirming(false);
    }
  };

  // 사전 스케줄링 결과 렌더링
  const renderPrescheduleResult = () => {
    if (!prescheduleResult) return null;

    const formatScheduleSlot = (slot: IPtSchedule) => {
      const date = new Date(slot.date);
      const thisYear = new Date().getFullYear();
      const year = date.getFullYear() === thisYear ? null : date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekDay = date.getDay();
      const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];

      return {
        dateStr: `${year ? `${year}년 ` : ""}${month}월 ${day}일`,
        weekDay: weekDayNames[weekDay],
        timeStr: `${formatTime(slot.startTime)} ~ ${formatTime(slot.endTime)}`,
        isWeekend: weekDay === 0 || weekDay === 6,
      };
    };

    const possibleSchedules = prescheduleResult.schedules.filter(
      (s) => s.possible
    );
    const impossibleSchedules = prescheduleResult.schedules.filter(
      (s) => !s.possible
    );

    return (
      <Card>
        <CardContent className="p-6">
          {/* 성공한 일정들 */}
          <div className="mb-6">
            <h3 className="font-bold text-green-600 mb-3">
              예약 완료된 일정 ({possibleSchedules.length}회)
            </h3>
            <div className="space-y-2">
              {possibleSchedules
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((slot, index) => {
                  const formatted = formatScheduleSlot(slot);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="min-w-[80px]">
                          {formatted.dateStr}
                        </span>
                        <Badge
                          variant={formatted.isWeekend ? "warning" : "default"}
                        >
                          {formatted.weekDay}요일
                        </Badge>
                      </div>
                      <span className="font-mono text-sm">
                        {formatted.timeStr}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 실패한 일정들 */}
          {impossibleSchedules.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-red-600 mb-3">
                예약 불가능한 일정 ({impossibleSchedules.length}회)
              </h3>

              <div className="mb-3 p-3 bg-gray-100 border rounded-lg">
                <p className="text-sm text-gray-700">
                  이 일정들은 트레이너 휴무일이나 센터 휴무일과 겹쳐 예약되지
                  않았습니다. 마이페이지에서 새로 잡으실 수 있습니다.
                </p>
              </div>

              <div className="space-y-2">
                {impossibleSchedules
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  )
                  .map((slot, index) => {
                    const formatted = formatScheduleSlot(slot);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg opacity-75 line-through"
                      >
                        <div className="flex items-center gap-3">
                          <span className="min-w-[80px]">
                            {formatted.dateStr}
                          </span>
                          <Badge variant="error">{formatted.weekDay}요일</Badge>
                        </div>
                        <span className="font-mono text-sm">
                          {formatted.timeStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              취소하기
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? "처리 중..." : "신청 완료"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 사전 스케줄링 결과 표시
  if (prescheduleResult) {
    return renderPrescheduleResult();
  }

  // 스케줄 표시 계산
  const getScheduleDisplay = () => {
    if (pattern.regular) {
      // 정기 수업: schedule.service의 함수 사용
      const calculatedSchedules = convertRegularScheduleToSlots(
        chosenSchedule,
        selectedPt.totalCount
      );

      return calculatedSchedules
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((schedule) => (
          <div
            key={`${schedule.date.toISOString()}-${schedule.startTime}`}
            className="text-sm"
          >
            {formatDateWithWeekday(schedule.date)}{" "}
            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </div>
        ));
    } else {
      // 비정기 수업: 연속된 시간대를 하나의 범위로 표시
      return Object.entries(chosenSchedule)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, times]) => {
          if (times.length === 0) return null;

          const startTime = times[0];
          const endTime = addThirtyMinutes(times[times.length - 1]);
          const dateObj = new Date(date);

          return (
            <div key={date} className="text-sm">
              {formatDateWithWeekday(dateObj)} {formatTime(startTime)} -{" "}
              {formatTime(endTime)}
            </div>
          );
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>신청 내용을 확인하고 최종 신청해주세요.</p>
      </div>

      {/* 신청 요약 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">신청 요약</h3>

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">헬스장</span>
              <div className="font-medium">{selectedCenter.title}</div>
            </div>

            <div>
              <span className="text-sm text-gray-600">PT 프로그램</span>
              <div className="font-medium">{selectedPt.title}</div>
              <div className="text-sm text-gray-600">
                총 {selectedPt.totalCount}회 • 회당 {selectedPt.time}시간 •{" "}
                {selectedPt.price.toLocaleString()}원
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-600">담당 트레이너</span>
              <div className="font-medium">{selectedTrainer.user.username}</div>
            </div>

            <div>
              <span className="text-sm text-gray-600">수업 방식</span>
              <div className="font-medium">
                {pattern.regular
                  ? `정기 수업 (주 ${pattern.count}회)`
                  : "비정기 수업"}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-600">수업 일정</span>
              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                {getScheduleDisplay()}
              </div>
              {pattern.regular && (
                <div className="text-xs text-gray-500 mt-2">
                  * 트레이너 휴무일은 자동으로 건너뛰어 계산됩니다.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메시지 입력 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            트레이너에게 한마디
          </h3>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="운동 목표나 요청사항을 적어주세요 (선택사항)"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 스케줄 확인 중 표시 */}
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">스케줄을 확인하고 있습니다...</p>
      </div>

      {/* 취소 처리 중 로딩 오버레이 */}
      <LoadingOverlay
        isVisible={isCanceling}
        message="생성된 일정을 삭제하고 초기 페이지로 이동합니다"
      />
    </div>
  );
};

export default ConfirmationStep;
