"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import type { GetTrainerScheduleResult } from "@/app/services/trainer/schedule.service";
import { Button } from "@/app/components/ui/Button";

const TrainerSchedulePage = () => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(now);
  const [currentMonth, setCurrentMonth] = useState<Date>(now);

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
      const dateKey = format(new Date(off.date), "yyyy-MM-dd");
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
  const formatOffTime = (startTime: number, endTime: number) => {
    if (startTime === 0 && endTime === 2359) {
      return "휴무";
    } else if (startTime === 0 && endTime === 1200) {
      return "오전반차";
    } else if (startTime === 1200 && endTime === 2359) {
      return "오후반차";
    } else {
      return `${formatTime(startTime)} ~ ${formatTime(endTime)}`;
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
        <div className="mb-6 flex justify-between">
          <PageHeader
            title="스케줄 관리"
            subtitle="월간 레슨 및 휴무 일정 관리"
          />
          <div className="flex justify-center items-center">
            <Button>
              <span>휴무 신청</span>
            </Button>
          </div>
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
                      <span className="text-sm text-gray-600">스케줄 로딩 중...</span>
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
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold">
                  {selectedDate
                    ? format(selectedDate, "M월 d일 (EEEE)", { locale: ko })
                    : "날짜를 선택하세요"}
                </h3>
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
                              <p className="font-medium text-red-900">
                                {formatOffTime(off.startTime, off.endTime)}
                              </p>
                              <Badge variant="error" className="text-xs">
                                휴무
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
    </div>
  );
};

export default TrainerSchedulePage;
