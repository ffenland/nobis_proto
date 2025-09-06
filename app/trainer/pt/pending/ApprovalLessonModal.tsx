// app/trainer/pt/pending/ApprovalLessonModal.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { 
  formatTime, 
  generateTimeSlots, 
  getMinSelectableDate,
  filterFutureTimeSlots,
  type TimeInt 
} from "@/app/lib/utils/time.utils";
import type { GetTrainerPendingPtsResult } from "@/app/services/trainer/pt.service";

// 스케줄 체크 결과 타입
interface ScheduleCheckResult {
  conflicts: {
    id: string;
    startTime: string;
    endTime: string;
    memberName: string;
  }[];
  isAvailable: boolean;
  message: string;
}

interface ApprovalLessonModalProps {
  pt: GetTrainerPendingPtsResult[number];
  isLoading: boolean;
  onApprove: (data: {
    scheduledAt: string;
    endAt: string;
    memo?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const ApprovalLessonModal = ({ 
  pt, 
  isLoading, 
  onApprove, 
  onCancel 
}: ApprovalLessonModalProps) => {
  // 상태 관리
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(pt.startDate).toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [memo, setMemo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [scheduleCheckLoading, setScheduleCheckLoading] = useState(false);
  const [scheduleCheckResult, setScheduleCheckResult] = useState<ScheduleCheckResult | null>(null);

  // 오늘 날짜 계산 (최소 선택 가능 날짜)
  const todayDate = getMinSelectableDate();
  // PT 시작일도 최소 날짜로 고려
  const minDate = selectedDate < todayDate ? selectedDate : todayDate;

  // 시간 슬롯 생성 (6:00 ~ 22:00, 30분 단위)
  const allTimeSlots = generateTimeSlots(600, 2200);
  
  // 선택된 날짜에 따라 과거 시간 필터링
  const timeSlots = selectedDate 
    ? filterFutureTimeSlots(allTimeSlots, selectedDate)
    : allTimeSlots;

  // 스케줄 체크 함수
  const checkSchedule = useCallback(async (date: string, start: number, end: number) => {
    if (!date || !start || !end) return;

    setScheduleCheckLoading(true);
    setError(null);
    setScheduleCheckResult(null);

    try {
      // 날짜와 시간을 조합하여 ISO 문자열 생성
      const startHour = Math.floor(start / 100);
      const startMinute = start % 100;
      const endHour = Math.floor(end / 100);
      const endMinute = end % 100;

      const scheduledAt = new Date(`${date}T${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}:00`);
      const endAt = new Date(`${date}T${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`);

      const response = await fetch(
        `/api/trainer/lesson/schedule-check?scheduledAt=${scheduledAt.toISOString()}&endAt=${endAt.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("스케줄 체크 요청이 실패했습니다.");
      }

      const result = await response.json();
      setScheduleCheckResult(result);

      // 충돌이 있는 경우 에러 메시지 설정
      if (!result.isAvailable && result.conflicts.length > 0) {
        const conflict = result.conflicts[0];
        setError(`선택하신 날짜에 ${conflict.startTime}부터 ${conflict.endTime}까지 ${conflict.memberName}님과의 수업이 있습니다.`);
      }
    } catch (error) {
      console.error("스케줄 체크 실패:", error);
      setError("스케줄 체크 중 오류가 발생했습니다.");
    } finally {
      setScheduleCheckLoading(false);
    }
  }, []);

  // 종료 시간 옵션 (시작 시간 선택 후)
  const getEndTimeOptions = () => {
    if (!startTime) return [];

    // 시작 시간부터 최소 30분, 최대 2시간까지 10분 단위로 옵션 생성
    const endOptions = [];
    const startHour = Math.floor(startTime / 100);
    const startMinute = startTime % 100;
    const startTotalMinutes = startHour * 60 + startMinute;

    // 30분부터 120분(2시간)까지 10분 단위
    for (let addMinutes = 30; addMinutes <= 120; addMinutes += 10) {
      const endTotalMinutes = startTotalMinutes + addMinutes;
      const endHour = Math.floor(endTotalMinutes / 60);
      const endMinute = endTotalMinutes % 60;
      const endTime = endHour * 100 + endMinute;

      // 22:30까지만 가능
      if (endTime <= 2230) {
        endOptions.push(endTime);
      }
    }

    // 선택된 날짜에 따라 과거 시간 필터링 (종료 시간도 미래여야 함)
    return selectedDate 
      ? filterFutureTimeSlots(endOptions as TimeInt[], selectedDate)
      : endOptions;
  };

  // 폼 제출 처리 (단순화)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !startTime || !endTime) {
      return;
    }

    // 스케줄 충돌이 있으면 제출 차단
    if (scheduleCheckResult && !scheduleCheckResult.isAvailable) {
      return;
    }

    try {
      // 날짜와 시간을 조합하여 Date 객체 생성
      const hour = Math.floor(startTime / 100);
      const minute = startTime % 100;
      const endHour = Math.floor(endTime / 100);
      const endMinute = endTime % 100;

      const scheduledDate = new Date(
        `${selectedDate}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`
      );
      const endDate = new Date(
        `${selectedDate}T${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`
      );

      await onApprove({
        scheduledAt: scheduledDate.toISOString(),
        endAt: endDate.toISOString(),
        memo: memo.trim(),
      });
    } catch (error: any) {
      // 모든 에러는 부모 컴포넌트로 전달
      throw error;
    }
  };

  // 시작 시간 변경 시 종료 시간 자동 설정 및 스케줄 체크
  const handleStartTimeChange = async (time: number) => {
    setStartTime(time);
    setError(null); // 시간 변경 시 에러 초기화
    setScheduleCheckResult(null);

    // PT 상품의 세션 시간 기본값으로 자동 설정 (기본값은 60분)
    const sessionMinutes = pt.ptProduct.time || 60;

    const startHour = Math.floor(time / 100);
    const startMinute = time % 100;
    const startTotalMinutes = startHour * 60 + startMinute;

    // 세션 시간만큼 더해서 종료 시간 계산
    const endTotalMinutes = startTotalMinutes + sessionMinutes;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    const calculatedEndTime = endHour * 100 + endMinute;

    let finalEndTime;
    // 22:30까지만 가능
    if (calculatedEndTime <= 2230) {
      finalEndTime = calculatedEndTime;
    } else {
      // 22:30 넘으면 22:30으로 설정
      finalEndTime = 2230;
    }
    
    setEndTime(finalEndTime);

    // 스케줄 체크 (시작시간과 종료시간이 모두 설정되면)
    if (selectedDate && time && finalEndTime) {
      await checkSchedule(selectedDate, time, finalEndTime);
    }
  };

  return (
    <>
      {/* 모달 배경 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">PT 승인 및 첫 수업 등록</h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* PT 정보 요약 */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {pt.member?.user.username}님의 {pt.ptProduct.title}
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• 총 {pt.ptProduct.totalCount}회 ({pt.ptProduct.time || 60}분/회)</div>
                  <div>• 희망 시작일: {new Date(pt.startDate).toLocaleDateString('ko-KR')}</div>
                  {pt.goals && (
                    <div>• 운동 목표: {pt.goals}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 첫 수업 일정 등록 폼 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">첫 수업 일정 선택</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 날짜 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수업 날짜
                    </label>
                    <input
                      type="date"
                      min={minDate}
                      value={selectedDate}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        setSelectedDate(newDate);
                        setError(null);
                        setScheduleCheckResult(null);
                        
                        // 시간이 모두 설정되어 있으면 스케줄 체크
                        if (startTime && endTime) {
                          await checkSchedule(newDate, startTime, endTime);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={isLoading}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      기본값: PT 희망 시작일 ({new Date(pt.startDate).toLocaleDateString('ko-KR')})
                    </p>
                  </div>

                  {/* 시작 시간 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시작 시간
                    </label>
                    <select
                      value={startTime || ""}
                      onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={isLoading}
                    >
                      <option value="">시간을 선택하세요</option>
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatTime(slot)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 종료 시간 선택 */}
                  {startTime && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        종료 시간
                      </label>
                      <select
                        value={endTime || ""}
                        onChange={async (e) => {
                          const newEndTime = Number(e.target.value);
                          setEndTime(newEndTime);
                          setError(null);
                          setScheduleCheckResult(null);
                          
                          // 날짜와 시작시간이 설정되어 있으면 스케줄 체크
                          if (selectedDate && startTime) {
                            await checkSchedule(selectedDate, startTime, newEndTime);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isLoading}
                      >
                        <option value="">시간을 선택하세요</option>
                        {getEndTimeOptions().map((slot) => (
                          <option key={slot} value={slot}>
                            {formatTime(slot)}
                          </option>
                        ))}
                      </select>
                      {endTime && (
                        <p className="text-sm text-gray-500 mt-1">
                          수업 시간:{" "}
                          {Math.round(
                            Math.floor(endTime / 100) * 60 +
                              (endTime % 100) -
                              (Math.floor(startTime / 100) * 60 + (startTime % 100))
                          )}
                          분 (권장: {pt.ptProduct.time || 60}분)
                        </p>
                      )}
                    </div>
                  )}

                  {/* 스케줄 체크 상태 */}
                  {scheduleCheckLoading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                        <p className="text-sm text-blue-700">스케줄을 확인하고 있습니다...</p>
                      </div>
                    </div>
                  )}

                  {/* 스케줄 가능 상태 */}
                  {scheduleCheckResult && scheduleCheckResult.isAvailable && !scheduleCheckLoading && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-semibold text-green-800">스케줄 사용 가능</h4>
                          <p className="text-sm text-green-700 mt-1">{scheduleCheckResult.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 에러 메시지 (스케줄 충돌) */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-semibold text-red-800">스케줄 충돌</h4>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                          <p className="text-xs text-red-600 mt-2">다른 날짜나 시간을 선택해주세요.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 메모 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      첫 수업 메모 (선택)
                    </label>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="첫 수업에 대한 메모를 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>

                  {/* 제출 버튼 */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={
                        isLoading || 
                        !selectedDate || 
                        !startTime || 
                        !endTime ||
                        scheduleCheckLoading ||
                        (scheduleCheckResult ? !scheduleCheckResult.isAvailable : false)
                      }
                      className="flex-1"
                    >
                      {isLoading ? "처리 중..." : 
                       scheduleCheckLoading ? "스케줄 확인 중..." : 
                       "PT 승인 및 첫 수업 등록"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onCancel}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 안내 사항 */}
            <Card className="mt-6 bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <h4 className="font-semibold text-green-900 mb-2">✅ 승인 및 등록 안내</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>
                    • PT 승인과 동시에 첫 수업이 등록됩니다.
                  </li>
                  <li>
                    • 수업 시간은 PT 상품의 기본 시간({pt.ptProduct.time || 60}분)으로 자동 설정됩니다.
                  </li>
                  <li>• 필요시 종료 시간을 조정할 수 있습니다.</li>
                  <li>• 회원에게 승인 알림과 첫 수업 일정이 전달됩니다.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApprovalLessonModal;