// app/trainer/pt/[id]/new-lesson/page.tsx
"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import { Button } from "@/app/components/ui/Button";
import { generateTimeSlots, formatTime } from "@/app/lib/utils/time.utils";
import type { GetTrainerScheduleResult } from "@/app/services/trainer/schedule.service";
import type { GetTrainerPtDetailResult } from "@/app/services/trainer/pt.service";
import type { CreateLessonInput } from "@/app/services/trainer/lesson.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

const NewLessonPage = ({ params }: PageProps) => {
  const resolvedParams = use(params);
  const ptId = resolvedParams.id;
  const router = useRouter();

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(now);
  const [currentMonth, setCurrentMonth] = useState<Date>(now);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [lessonMemo, setLessonMemo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>("");

  // PT 정보 조회
  const { data: ptData, error: ptError } = useSWR<GetTrainerPtDetailResult>(
    `/api/trainer/pt/${ptId}`
  );

  // 현재 표시 중인 월을 YYYYMM 형식으로 변환
  const targetMonth = format(currentMonth, "yyyyMM");

  // 스케줄 데이터 페칭
  const {
    data: scheduleData,
    error: scheduleError,
    isLoading,
  } = useSWR<GetTrainerScheduleResult>(
    `/api/trainer/schedule?target=${targetMonth}`
  );

  // 타입 정의
  type LessonType = GetTrainerScheduleResult["lessons"][0];
  type OffType = GetTrainerScheduleResult["offDays"][0];

  // 날짜별 스케줄 데이터 매핑
  const dateScheduleMap = useMemo(() => {
    if (!scheduleData) return new Map();

    const map = new Map<
      string,
      {
        lessons: LessonType[];
        offs: OffType[];
      }
    >();

    // Lesson 데이터 매핑
    scheduleData.lessons.forEach((lesson) => {
      const dateKey = format(new Date(lesson.scheduledAt), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, { lessons: [], offs: [] });
      }
      map.get(dateKey)!.lessons.push(lesson);
    });

    // TrainerOff 데이터 매핑
    scheduleData.offDays.forEach((off) => {
      const dateKey = format(new Date(off.startAt), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, { lessons: [], offs: [] });
      }
      map.get(dateKey)!.offs.push(off);
    });

    return map;
  }, [scheduleData]);

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

  // 시간 선택 옵션 생성 (06:00 ~ 23:30, 30분 단위)
  const timeSlots = generateTimeSlots();
  const formattedTimeSlots = timeSlots.map((time) => formatTime(time));

  // 종료 시간 자동 계산 함수
  const calculateEndTime = (startTime: string): string => {
    if (!ptData || !startTime) return "";

    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    // sessionTime은 분 단위로 저장되어 있음
    const endDate = new Date(
      startDate.getTime() + ptData.ptProduct.sessionTime * 60 * 1000
    );

    return format(endDate, "HH:mm");
  };

  // 레슨 생성 가능 여부 체크
  const canCreateLesson = useMemo(() => {
    if (!ptData) return false;

    const nonCanceledLessons = ptData.lessons.filter(
      (l) => l.status !== "cancelled"
    );
    return nonCanceledLessons.length < ptData.ptProduct.totalCount;
  }, [ptData]);

  // 충돌 검사 함수
  const checkConflict = (startTime: string) => {
    if (!selectedDate || !selectedDateSchedule || !startTime) return "";

    const endTime = calculateEndTime(startTime);
    if (!endTime) return "";

    const startDate = new Date(
      `${format(selectedDate, "yyyy-MM-dd")}T${startTime}:00`
    );
    const endDate = new Date(
      `${format(selectedDate, "yyyy-MM-dd")}T${endTime}:00`
    );

    // 레슨과의 충돌 검사
    for (const lesson of selectedDateSchedule.lessons) {
      const lessonStart = new Date(lesson.scheduledAt);
      const lessonEnd = new Date(lesson.endAt);

      if (startDate < lessonEnd && endDate > lessonStart) {
        return `${format(lessonStart, "HH:mm")}-${format(
          lessonEnd,
          "HH:mm"
        )}에 ${lesson.member.username}님과의 수업이 있습니다.`;
      }
    }

    // 휴무와의 충돌 검사
    for (const off of selectedDateSchedule.offs) {
      const offStart = new Date(off.startAt);
      const offEnd = new Date(off.endAt);

      if (startDate < offEnd && endDate > offStart) {
        const offStartHour = offStart.getHours();
        const offEndHour = offEnd.getHours();
        const offEndMinute = offEnd.getMinutes();

        let offType = "";
        if (offStartHour === 0 && offEndHour === 23 && offEndMinute === 59) {
          offType = "종일 휴무";
        } else if (
          offStartHour === 0 &&
          offEndHour === 12 &&
          offEndMinute === 59
        ) {
          offType = "오전 휴무";
        } else if (
          offStartHour === 13 &&
          offEndHour === 23 &&
          offEndMinute === 59
        ) {
          offType = "오후 휴무";
        } else {
          offType = `${format(offStart, "HH:mm")}-${format(
            offEnd,
            "HH:mm"
          )} 휴무`;
        }
        return `${offType} 일정이 있습니다.`;
      }
    }

    return "";
  };

  // 시간 선택 핸들러
  const handleStartTimeChange = (time: string) => {
    setSelectedStartTime(time);
    if (time) {
      const conflict = checkConflict(time);
      setConflictMessage(conflict);
    } else {
      setConflictMessage("");
    }
  };

  // 레슨 생성 핸들러
  const handleLessonCreate = async () => {
    if (!selectedDate || !selectedStartTime || conflictMessage) {
      return;
    }

    const endTime = calculateEndTime(selectedStartTime);
    if (!endTime) {
      alert("종료 시간을 계산할 수 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(
        `${format(selectedDate, "yyyy-MM-dd")}T${selectedStartTime}:00`
      );
      const endAt = new Date(
        `${format(selectedDate, "yyyy-MM-dd")}T${endTime}:00`
      );

      const lessonData: CreateLessonInput = {
        scheduledAt: scheduledAt.toISOString(),
        endAt: endAt.toISOString(),
        memo: lessonMemo || undefined,
      };

      const response = await fetch(`/api/trainer/pt/${ptId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lessonData),
      });

      const result = await response.json();

      if (result.success) {
        // 스케줄 데이터 재조회
        mutate(`/api/trainer/schedule?target=${targetMonth}`);
        // PT 상세 페이지로 이동
        router.push(`/trainer/pt/${ptId}`);
      } else {
        alert(result.message || "레슨 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("레슨 생성 오류:", error);
      alert("레슨 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 초기화
  const handleOpenModal = () => {
    setIsLessonModalOpen(true);
    setSelectedStartTime("");
    setLessonMemo("");
    setConflictMessage("");
  };

  if (ptError || scheduleError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">데이터를 불러올 수 없습니다.</p>
          <p className="text-gray-600 text-sm">
            {ptError?.message || scheduleError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6 flex justify-between items-center">
          <PageHeader
            title="새 레슨 생성"
            subtitle={
              ptData ? `${ptData.memberName}님 - ${ptData.ptProduct.title}` : ""
            }
          />
          <Button variant="outline" onClick={() => router.back()}>
            뒤로가기
          </Button>
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
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
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
                {selectedDate && (
                  <Button
                    variant="primary"
                    onClick={handleOpenModal}
                    disabled={isLoading || !canCreateLesson}
                  >
                    <span>
                      {canCreateLesson ? "레슨 생성" : "수업 횟수 소진"}
                    </span>
                  </Button>
                )}
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
                        {selectedDateSchedule.offs.map((off: OffType) => {
                          const startDate = new Date(off.startAt);
                          const endDate = new Date(off.endAt);
                          const startHour = startDate.getHours();
                          const endHour = endDate.getHours();
                          const endMinute = endDate.getMinutes();

                          let offType = "";
                          if (
                            startHour === 0 &&
                            endHour === 23 &&
                            endMinute === 59
                          ) {
                            offType = "휴무";
                          } else if (
                            startHour === 0 &&
                            endHour === 12 &&
                            endMinute === 59
                          ) {
                            offType = "오전반차";
                          } else if (
                            startHour === 13 &&
                            endHour === 23 &&
                            endMinute === 59
                          ) {
                            offType = "오후반차";
                          } else {
                            offType = `${format(startDate, "HH:mm")} ~ ${format(
                              endDate,
                              "HH:mm"
                            )}`;
                          }

                          return (
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
                                  {offType}
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
                          );
                        })}
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

      {/* 레슨 생성 모달 */}
      {isLessonModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">새 레슨 생성</h3>

            {/* 선택한 날짜 표시 */}
            <div className="mb-4">
              <p className="text-gray-700">
                {format(selectedDate, "yyyy년 M월 d일 EEEE", { locale: ko })}
              </p>
            </div>

            {/* 시작 시간 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 시간
              </label>
              <select
                value={selectedStartTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">선택하세요</option>
                {formattedTimeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* 자동 계산된 종료 시간 표시 */}
            {selectedStartTime && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 시간 (자동 계산)
                </label>
                <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50">
                  <span className="text-gray-900">
                    {calculateEndTime(selectedStartTime)}
                    <span className="text-sm text-gray-500 ml-2">
                      ({ptData?.ptProduct.sessionTime}분 수업)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* 충돌 메시지 */}
            {conflictMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{conflictMessage}</p>
              </div>
            )}

            {/* 메모 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모 (선택사항)
              </label>
              <textarea
                value={lessonMemo}
                onChange={(e) => setLessonMemo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="레슨 관련 메모를 입력하세요"
              />
            </div>

            {/* 버튼들 */}
            <div className="flex gap-3">
              <Button
                variant="default"
                className="flex-1 bg-green-700 text-white hover:bg-green-500"
                onClick={handleLessonCreate}
                disabled={
                  !selectedStartTime || !!conflictMessage || isSubmitting
                }
              >
                {isSubmitting ? "생성 중..." : "레슨 생성"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsLessonModalOpen(false);
                  setSelectedStartTime("");
                  setLessonMemo("");
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

export default NewLessonPage;
