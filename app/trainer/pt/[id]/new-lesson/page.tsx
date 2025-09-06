// app/trainer/pt/[id]/new-lesson/page.tsx
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  formatTime,
  generateTimeSlots,
  getMinSelectableDate,
  filterFutureTimeSlots,
  toTimeInt,
  type TimeInt,
} from "@/app/lib/utils/time.utils";
import type { GetTrainerPtDetailResult } from "@/app/services/trainer/pt.service";
import type { CreateLessonInput } from "@/app/services/trainer/lesson.service";
import type { CreateLessonServiceResult } from "@/app/services/trainer/lesson.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

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

// POST 요청을 위한 fetcher
async function createLessonFetcher(
  url: string,
  { arg }: { arg: CreateLessonInput }
): Promise<CreateLessonServiceResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();

    // 409 스케줄 충돌 에러 처리
    if (response.status === 409 && errorData.type === "SCHEDULE_CONFLICT") {
      throw new Error(errorData.error);
    }

    throw new Error(errorData.error || "레슨 생성에 실패했습니다.");
  }

  return response.json();
}

const NewLessonPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const router = useRouter();

  // PT 정보 가져오기
  const { data: pt } = useSWR<GetTrainerPtDetailResult>(
    `/api/trainer/pt/${id}`
  );

  // 상태 관리
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [memo, setMemo] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // 스케줄 체크 관련 상태
  const [scheduleCheckLoading, setScheduleCheckLoading] = useState(false);
  const [scheduleCheckResult, setScheduleCheckResult] =
    useState<ScheduleCheckResult | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // 레슨 생성 mutation
  const { trigger, isMutating } = useSWRMutation(
    `/api/trainer/pt/${id}`,
    createLessonFetcher
  );

  // Toast 함수
  const showToast = (
    type: "success" | "error" | "warning" | "info",
    message: string
  ) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 스케줄 체크 함수
  const checkSchedule = async (date: string, start: number, end: number) => {
    if (!date || !start || !end) return;

    setScheduleCheckLoading(true);
    setScheduleError(null);
    setScheduleCheckResult(null);

    try {
      // 날짜와 시간을 조합하여 ISO 문자열 생성
      const startHour = Math.floor(start / 100);
      const startMinute = start % 100;
      const endHour = Math.floor(end / 100);
      const endMinute = end % 100;

      const scheduledAt = new Date(
        `${date}T${startHour.toString().padStart(2, "0")}:${startMinute
          .toString()
          .padStart(2, "0")}:00`
      );
      const endAt = new Date(
        `${date}T${endHour.toString().padStart(2, "0")}:${endMinute
          .toString()
          .padStart(2, "0")}:00`
      );

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
        setScheduleError(
          `선택하신 시간에 ${conflict.startTime}부터 ${conflict.endTime}까지 ${conflict.memberName}님과의 수업이 있습니다.`
        );
      }
    } catch (error) {
      console.error("스케줄 체크 실패:", error);
      setScheduleError("스케줄 체크 중 오류가 발생했습니다.");
    } finally {
      setScheduleCheckLoading(false);
    }
  };

  // 오늘 날짜 계산 (최소 선택 가능 날짜)
  const minDate = getMinSelectableDate();

  // 시간 슬롯 생성 (6:00 ~ 22:00, 30분 단위)
  const allTimeSlots = generateTimeSlots(600, 2200);

  // 선택된 날짜에 따라 과거 시간 필터링
  const timeSlots = selectedDate
    ? filterFutureTimeSlots(allTimeSlots, selectedDate)
    : allTimeSlots;

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

    return endOptions;
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !startTime || !endTime) {
      showToast("warning", "날짜와 시간을 모두 선택해주세요.");
      return;
    }

    // 스케줄 충돌이 있으면 제출 차단
    if (scheduleCheckResult && !scheduleCheckResult.isAvailable) {
      showToast("warning", "스케줄 충돌이 있습니다. 다른 시간을 선택해주세요.");
      return;
    }

    try {
      // 날짜와 시간을 조합하여 Date 객체 생성
      const hour = Math.floor(startTime / 100);
      const minute = startTime % 100;

      // 시작 시간 - 로컬 시간으로 Date 객체 생성
      const scheduledDate = new Date(
        `${selectedDate}T${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}:00`
      );

      // 종료 시간 = 시작 시간 + PT 상품의 세션 시간(분)
      const sessionMinutes = pt?.ptProduct.sessionTime || 60;
      const endDate = new Date(
        scheduledDate.getTime() + sessionMinutes * 60 * 1000
      );

      const result = await trigger({
        scheduledAt: scheduledDate.toISOString(),
        endAt: endDate.toISOString(),
        memo: memo.trim(),
      });

      if (result.success) {
        showToast(
          "success",
          "새 수업이 성공적으로 등록되었습니다. 잠시후 레슨 페이지로 이동합니다."
        );
        // 등록된 레슨 상세 페이지로 바로 이동
        router.push(`/trainer/lesson/${result.lessonId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "레슨 생성에 실패했습니다.";

      // 스케줄 충돌 에러인지 확인
      const isScheduleConflict = errorMessage.includes("일정이 중복됩니다");

      showToast(isScheduleConflict ? "warning" : "error", errorMessage);
    }
  };

  // 시작 시간 변경 시 종료 시간 자동 설정 및 스케줄 체크
  const handleStartTimeChange = async (time: number) => {
    setStartTime(time);
    setScheduleError(null); // 시간 변경 시 에러 초기화
    setScheduleCheckResult(null);

    // PT 상품의 세션 시간 기본값 60분으로 자동 설정
    const sessionMinutes = pt?.ptProduct.sessionTime || 60;

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

    // 스케줄 체크 (날짜와 시작/종료 시간이 모두 설정되면)
    if (selectedDate && time && finalEndTime) {
      await checkSchedule(selectedDate, time, finalEndTime);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* 헤더 */}
      <div className="mb-6">
        <PageHeader
          title="새 수업 등록"
          subtitle={pt ? `${pt.memberName}님의 ${pt.ptProduct.title}` : ""}
        />
      </div>

      {/* 뒤로가기 버튼 */}
      <Link href={`/trainer/pt/${id}`} className="inline-block mb-6">
        <Button variant="outline" size="sm">
          ← PT 상세로 돌아가기
        </Button>
      </Link>

      {/* 레슨 등록 폼 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">수업 일정 선택</h3>
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
                  setScheduleError(null);
                  setScheduleCheckResult(null);

                  // 시간이 모두 설정되어 있으면 스케줄 체크
                  if (startTime && endTime) {
                    await checkSchedule(newDate, startTime, endTime);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
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
                    setScheduleError(null);
                    setScheduleCheckResult(null);

                    // 날짜와 시작시간이 설정되어 있으면 스케줄 체크
                    if (selectedDate && startTime) {
                      await checkSchedule(selectedDate, startTime, newEndTime);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">시간을 선택하세요</option>
                  {getEndTimeOptions().map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTime(slot)}
                    </option>
                  ))}
                </select>
                {pt && endTime && (
                  <p className="text-sm text-gray-500 mt-1">
                    수업 시간:{" "}
                    {Math.round(
                      Math.floor(endTime / 100) * 60 +
                        (endTime % 100) -
                        (Math.floor(startTime / 100) * 60 + (startTime % 100))
                    )}
                    분 (권장: {pt.ptProduct.sessionTime}분)
                  </p>
                )}
              </div>
            )}

            {/* 스케줄 체크 상태 */}
            {scheduleCheckLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <p className="text-sm text-blue-700">
                    스케줄을 확인하고 있습니다...
                  </p>
                </div>
              </div>
            )}

            {/* 스케줄 가능 상태 */}
            {scheduleCheckResult &&
              scheduleCheckResult.isAvailable &&
              !scheduleCheckLoading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-400 mt-0.5 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-green-800">
                        스케줄 사용 가능
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        {scheduleCheckResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* 에러 메시지 (스케줄 충돌) */}
            {scheduleError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-800">
                      스케줄 충돌
                    </h4>
                    <p className="text-sm text-red-700 mt-1">{scheduleError}</p>
                    <p className="text-xs text-red-600 mt-2">
                      다른 날짜나 시간을 선택해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모 (선택)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="수업 관련 메모를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isMutating ||
                  !selectedDate ||
                  !startTime ||
                  !endTime ||
                  scheduleCheckLoading ||
                  (scheduleCheckResult
                    ? !scheduleCheckResult.isAvailable
                    : false)
                }
                className="flex-1"
              >
                {isMutating
                  ? "등록 중..."
                  : scheduleCheckLoading
                  ? "스케줄 확인 중..."
                  : "수업 등록"}
              </Button>
              <Link href={`/trainer/pt/${id}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 안내 사항 */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-900 mb-2">📌 안내사항</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • 수업 시간은 PT 상품의 기본 시간({pt?.ptProduct.sessionTime}
              분)으로 자동 설정됩니다.
            </li>
            <li>• 필요시 종료 시간을 조정할 수 있습니다.</li>
            <li>• 등록된 수업은 PT 상세 페이지에서 확인할 수 있습니다.</li>
            <li>• 수업 시간 변경이 필요한 경우, 회원과 협의 후 진행하세요.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`
            px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm
            ${toastMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : ''}
            ${toastMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : ''}
            ${toastMessage.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : ''}
            ${toastMessage.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' : ''}
          `}>
            {/* 아이콘 */}
            {toastMessage.type === 'success' && (
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toastMessage.type === 'error' && (
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toastMessage.type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {toastMessage.type === 'info' && (
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewLessonPage;
