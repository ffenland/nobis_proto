"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import type { GetTrainerScheduleResult } from "@/app/services/trainer/schedule.service";
import { Button } from "@/app/components/ui/Button";

const TrainerSchedulePage = () => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(now);
  const [currentMonth, setCurrentMonth] = useState<Date>(now);
  const [isOffModalOpen, setIsOffModalOpen] = useState(false);
  const [selectedOffType, setSelectedOffType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>("");

  // 현재 표시 중인 월을 YYYYMM 형식으로 변환
  const targetMonth = format(currentMonth, "yyyyMM");

  // SWR로 데이터 페칭
  const { data, error, isLoading } = useSWR<GetTrainerScheduleResult>(
    `/api/trainer/schedule?target=${targetMonth}`
  );

  // 타입 정의
  type LessonType = GetTrainerScheduleResult["lessons"][0];
  type OffType = GetTrainerScheduleResult["offDays"][0];

  // 날짜별 스케줄 데이터 매핑
  const dateScheduleMap = useMemo(() => {
    if (!data) return new Map();

    const map = new Map<
      string,
      {
        lessons: LessonType[];
        offs: OffType[];
      }
    >();

    // Lesson 데이터 매핑
    data.lessons.forEach((lesson) => {
      const dateKey = format(new Date(lesson.scheduledAt), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, { lessons: [], offs: [] });
      }
      map.get(dateKey)!.lessons.push(lesson);
    });

    // TrainerOff 데이터 매핑
    data.offDays.forEach((off) => {
      const dateKey = format(new Date(off.startAt), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, { lessons: [], offs: [] });
      }
      map.get(dateKey)!.offs.push(off);
    });

    return map;
  }, [data]);

  // 선택된 날짜의 스케줄 정보
  const selectedDateSchedule = useMemo(() => {
    if (!selectedDate) return null;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return dateScheduleMap.get(dateKey) || { lessons: [], offs: [] };
  }, [selectedDate, dateScheduleMap]);

  // 날짜별 스타일 modifier
  const modifiers = {
    hasLesson: (date: Date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const schedule = dateScheduleMap.get(dateKey);
      return schedule ? schedule.lessons.length > 0 : false;
    },
    hasOff: (date: Date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const schedule = dateScheduleMap.get(dateKey);
      return schedule
        ? schedule.offs.length > 0 && schedule.lessons.length === 0
        : false;
    },
  };

  const modifiersStyles = {
    hasLesson: {
      backgroundColor: "#3B82F6",
      color: "white",
      fontWeight: "bold" as const,
    },
    hasOff: {
      backgroundColor: "#EF4444",
      color: "white",
      fontWeight: "bold" as const,
    },
  };

  // OFF 시간 표시 포맷
  const formatOffTime = (startAt: Date | string, endAt: Date | string) => {
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();

    // 종일 휴무 (00:00 ~ 23:59)
    if (
      startHour === 0 &&
      startMinute === 0 &&
      endHour === 23 &&
      endMinute === 59
    ) {
      return "휴무";
    }
    // 오전 휴무 (00:00 ~ 12:59)
    else if (
      startHour === 0 &&
      startMinute === 0 &&
      endHour === 12 &&
      endMinute === 59
    ) {
      return "오전반차";
    }
    // 오후 휴무 (13:00 ~ 23:59)
    else if (
      startHour === 13 &&
      startMinute === 0 &&
      endHour === 23 &&
      endMinute === 59
    ) {
      return "오후반차";
    }
    // 구체적인 시간대
    else {
      return `${format(startDate, "HH:mm")} ~ ${format(endDate, "HH:mm")}`;
    }
  };

  // 충돌 검사 함수
  const checkOffConflict = (offType: string) => {
    if (!selectedDate || !selectedDateSchedule || !offType) return "";

    // 휴무 시간 계산
    const targetDate = new Date(selectedDate);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    let startAt: Date;
    let endAt: Date;

    switch (offType) {
      case "FULL_DAY":
        startAt = new Date(year, month, day, 0, 0, 0);
        endAt = new Date(year, month, day, 23, 59, 0);
        break;
      case "MORNING":
        startAt = new Date(year, month, day, 0, 0, 0);
        endAt = new Date(year, month, day, 12, 59, 0);
        break;
      case "AFTERNOON":
        startAt = new Date(year, month, day, 13, 0, 0);
        endAt = new Date(year, month, day, 23, 59, 0);
        break;
      default:
        return "";
    }

    // 기존 레슨과의 충돌 검사
    for (const lesson of selectedDateSchedule.lessons) {
      const lessonStart = new Date(lesson.scheduledAt);
      const lessonEnd = new Date(lesson.endAt);

      // 시간 겹침 검사: startAt < lessonEnd && endAt > lessonStart
      if (startAt < lessonEnd && endAt > lessonStart) {
        return `${format(lessonStart, "HH:mm")}-${format(
          lessonEnd,
          "HH:mm"
        )}에 ${lesson.member.username}님과의 수업이 예정되어 있습니다.`;
      }
    }

    return "";
  };

  // 휴무 신청 관련 함수들
  const handleOffRequest = () => {
    setIsOffModalOpen(true);
    setSelectedOffType(null);
    setConflictMessage("");
  };

  const handleOffTypeSelect = (offType: string) => {
    setSelectedOffType(offType);
    // 충돌 검사 수행
    const conflict = checkOffConflict(offType);
    setConflictMessage(conflict);
  };

  const handleOffConfirm = async () => {
    if (!selectedDate || !selectedOffType || conflictMessage) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trainer/schedule/off", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          offType: selectedOffType,
        }),
      });

      if (response.ok) {
        // 성공 시 스케줄 데이터 재조회
        mutate(`/api/trainer/schedule?target=${targetMonth}`);
        setIsOffModalOpen(false);
        setSelectedOffType(null);
        setConflictMessage("");
        alert("휴무 신청이 완료되었습니다.");
      } else {
        const errorData = await response.json();
        alert(`휴무 신청 실패: ${errorData.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("휴무 신청 오류:", error);
      alert("휴무 신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOffCancel = () => {
    setSelectedOffType(null);
    setConflictMessage("");
  };

  const getOffTypeText = (offType: string) => {
    switch (offType) {
      case "FULL_DAY":
        return "휴무";
      case "MORNING":
        return "오전반차";
      case "AFTERNOON":
        return "오후반차";
      default:
        return "";
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">데이터를 불러올 수 없습니다.</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 반응형 컨테이너 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-2 w-full flex items-center justify-center">
          <PageHeader
            title="스케줄 관리"
            subtitle="월간 레슨 및 휴무 일정 관리"
          />
        </div>

        <div className="md:flex md:gap-6">
          {/* 달력 영역 */}
          <div className="md:flex-1">
            <Card className="mb-6 md:mb-0">
              <CardContent className="p-4">
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    navLayout="around"
                    animate
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    locale={ko}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className="w-full"
                    classNames={{
                      months: "flex flex-col",
                      month: "w-full",
                      caption: "flex justify-center items-center",

                      caption_label: "text-lg font-medium",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full flex-1",
                      head_cell:
                        "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                      row: "flex w-full mt-2",
                      cell: "relative h-10 text-center text-sm p-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-10 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_button: "w-full",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle:
                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                      month_grid: "w-full",
                    }}
                  />
                </div>

                {/* 데이터 로딩 상태 표시 */}
                {isLoading && (
                  <div className="flex justify-center mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-600">
                        스케줄 로딩 중...
                      </span>
                    </div>
                  </div>
                )}

                {/* 범례 */}
                {!isLoading && (
                  <div className="flex justify-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm text-gray-600">레슨</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm text-gray-600">휴무</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <span className="text-sm text-gray-600">일정없음</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 스케줄 상세 영역 */}
          <div className="md:w-96">
            <Card>
              <CardHeader className="pb-3 flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {selectedDate
                    ? format(selectedDate, "M월 d일 (EEEE)", { locale: ko })
                    : "날짜를 선택하세요"}
                </h3>
                <Button
                  variant="danger"
                  disabled={isLoading}
                  onClick={handleOffRequest}
                >
                  <span>휴무 신청</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDate && selectedDateSchedule ? (
                  <>
                    {/* 레슨 목록 */}
                    {selectedDateSchedule.lessons.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          레슨
                        </h4>
                        {selectedDateSchedule.lessons.map(
                          (lesson: LessonType) => (
                            <div
                              key={lesson.id}
                              className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-blue-900">
                                    {lesson.member.username} 회원님
                                  </p>
                                  <p className="text-sm text-blue-700">
                                    {format(
                                      new Date(lesson.scheduledAt),
                                      "HH:mm"
                                    )}{" "}
                                    ~ {format(new Date(lesson.endAt), "HH:mm")}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    {lesson.fitnessCenter.title}
                                  </p>
                                </div>
                                <Badge variant="info" className="text-xs">
                                  레슨
                                </Badge>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* OFF 목록 */}
                    {selectedDateSchedule.offs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          휴무
                        </h4>
                        {selectedDateSchedule.offs.map((off: OffType) => (
                          <div
                            key={off.id}
                            className="p-3 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div className="flex items-center justify-between">
                              <p
                                className={`font-medium ${
                                  off.state === "CONFIRMED"
                                    ? "text-red-900"
                                    : off.state === "PENDING"
                                    ? "text-purple-800"
                                    : "text-slate-700"
                                }`}
                              >
                                {formatOffTime(off.startAt, off.endAt)}
                              </p>
                              <Badge variant="error" className="text-xs">
                                {off.state === "PENDING"
                                  ? "승인 대기중"
                                  : off.state === "CONFIRMED"
                                  ? "승인 완료"
                                  : "오류"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 일정 없음 */}
                    {selectedDateSchedule.lessons.length === 0 &&
                      selectedDateSchedule.offs.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          <p>일정 없음</p>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>날짜를 선택하여 일정을 확인하세요</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 휴무 신청 모달 */}
      {isOffModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">휴무 신청</h3>

            {/* 선택한 날짜 표시 */}
            <div className="mb-6">
              <p className="text-gray-700">
                {format(selectedDate, "yyyy년 M월 d일 EEEE", { locale: ko })}
              </p>
            </div>

            {/* 휴무 유형 선택 버튼들 */}
            {!selectedOffType && (
              <div className="space-y-3 mb-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOffTypeSelect("FULL_DAY")}
                >
                  종일
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOffTypeSelect("MORNING")}
                >
                  오전
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOffTypeSelect("AFTERNOON")}
                >
                  오후
                </Button>
              </div>
            )}

            {/* 선택된 휴무 유형 확인 */}
            {selectedOffType && (
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  {format(selectedDate, "yyyy년 M월 d일 EEEE", { locale: ko })}{" "}
                  {getOffTypeText(selectedOffType)}를 신청합니다
                </p>

                {/* 충돌 메시지 */}
                {conflictMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{conflictMessage}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handleOffConfirm}
                    disabled={isSubmitting || !!conflictMessage}
                  >
                    {isSubmitting ? "신청 중..." : "예"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleOffCancel}
                    disabled={isSubmitting}
                  >
                    다시선택
                  </Button>
                </div>
              </div>
            )}

            {/* 모달 닫기 버튼 */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOffModalOpen(false);
                  setSelectedOffType(null);
                  setConflictMessage("");
                }}
                disabled={isSubmitting}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerSchedulePage;
