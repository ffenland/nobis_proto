"use client";

import { useEffect, useState } from "react";
import { getWeeklySchedule } from "./actions";
import {
  getWeekDayMapData,
  displayTime,
  convertUTCtoKST,
} from "@/app/lib/utils";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale("ko");

type Schedule = {
  id: string;
  attended: "ATTENDED" | "ABSENT" | "RESERVED";
  ptSchedule: {
    date: Date;
    startTime: number;
    endTime: number;
  };
  pt: {
    id: string;
    member: {
      user: {
        username: string;
      };
    } | null;
  };
};

type Off = {
  date: Date;
  startTime: number;
  endTime: number;
};

// 9:00 ~ 23:00, 30분 단위
const TIME_SLOTS = Array.from(
  { length: (23 - 9) * 2 + 1 },
  (_, i) => 900 + Math.floor(i / 2) * 100 + (i % 2) * 30
);

const SchedulePage = () => {
  const today = dayjs().startOf("day");
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [offs, setOffs] = useState<Off[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = dayjs().startOf("week").subtract(2, "week");
  const maxDate = dayjs().startOf("week").add(12, "week");

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWeeklySchedule(currentDate.toDate());
        setSchedules(data.schedules);
        setOffs(data.offs);
      } catch (e) {
        setError("데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [currentDate]);

  // 월~토 요일 정보
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = currentDate.startOf("week").add(i, "day"); // 월요일부터 시작
    return {
      date,
      dayInfo: getWeekDayMapData(date.toDate()),
    };
  });

  const handlePrevWeek = () => {
    const prev = currentDate.subtract(1, "week");
    if (prev.isBefore(minDate)) return;
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = currentDate.add(1, "week");
    if (next.isAfter(maxDate)) return;
    setCurrentDate(next);
  };

  // 각 요일별, 시간별 PT 스케줄 매핑
  const getScheduleBlock = (date: dayjs.Dayjs, time: number) => {
    const matchedSchedule = schedules.find((schedule) => {
      const scheduleDate = dayjs(convertUTCtoKST(schedule.ptSchedule.date));
      if (scheduleDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD")) {
        console.log(scheduleDate.format("YYYY-MM-DD"), "P");
        console.log(date.format("YYYY-MM-DD"), "T");
        console.log(
          scheduleDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD")
        );
        console.log(time);
        console.log("START", schedule.ptSchedule.startTime);
        console.log("END", schedule.ptSchedule.endTime);
      }

      return (
        scheduleDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD") &&
        schedule.ptSchedule.startTime <= time &&
        schedule.ptSchedule.endTime > time
      );
    });
    return matchedSchedule;
  };

  // 각 요일별, 시간별 오프(휴무) 매핑
  const getOffBlock = (date: dayjs.Dayjs, time: number) => {
    return offs.find((off) => {
      const offDate = dayjs(off.date);
      return (
        offDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD") &&
        off.startTime <= time &&
        off.endTime > time
      );
    });
  };

  return (
    <div className="p-2 md:p-4">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <button
          onClick={handlePrevWeek}
          className="btn btn-circle btn-ghost btn-xs md:btn-md"
          disabled={loading || currentDate.isBefore(minDate)}
        >
          <ChevronLeftIcon className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <h2 className="text-base md:text-xl font-bold">
          {currentDate.startOf("week").add(1, "day").format("YYYY년 MM월 DD일")}{" "}
          - {currentDate.startOf("week").add(6, "day").format("MM월 DD일")}
        </h2>
        <button
          onClick={handleNextWeek}
          className="btn btn-circle btn-ghost btn-xs md:btn-md"
          disabled={loading || currentDate.isSameOrAfter(maxDate)}
        >
          <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
      {error && <div className="text-red-500 text-center mb-2">{error}</div>}
      <div className="w-full">
        <div className="flex border rounded-lg w-full">
          {weekDays.map(({ date, dayInfo }, colIdx) => (
            <div
              key={date.format("YYYY-MM-DD")}
              className={`flex flex-col border-r last:border-r-0 bg-white min-w-0 ${
                colIdx === 0 ? "w-10" : "flex-1"
              }`}
            >
              {/* 요일 헤더 */}
              <div
                className={`h-8 md:h-10 flex flex-col items-center justify-center font-bold text-xs md:text-sm ${dayInfo.color}`}
              >
                <div>{dayInfo.kor.short}</div>
                <div className="text-[10px] md:text-xs text-gray-500">
                  {date.format("MM/DD")}
                </div>
              </div>
              <div className="h-2 border-b"></div>
              {/* 시간별 블록 */}
              {TIME_SLOTS.map((time, rowIdx) => {
                const schedule = getScheduleBlock(date, time);
                const off = getOffBlock(date, time);
                return (
                  <div
                    key={time}
                    className={`relative h-7 md:h-7 flex items-center justify-center border-b text-[10px] md:text-xs min-w-0
                      ${
                        schedule
                          ? "bg-green-200 text-green-900 font-bold"
                          : off
                          ? "bg-red-200 text-red-900 font-bold"
                          : colIdx === 0
                          ? "bg-gray-100"
                          : date.isBefore(today, "day") && colIdx !== 0
                          ? "bg-gray-200"
                          : "bg-white"
                      }
                    `}
                  >
                    {/* 첫번째 컬럼(월요일)에만 시간대 표시 */}
                    {colIdx === 0 ? (
                      <span
                        className="absolute left-1 top-0 -translate-y-1/2 text-gray-400 text-[10px] md:text-xs pointer-events-none select-none"
                        style={{ zIndex: 2 }}
                      >
                        {displayTime(time)}
                      </span>
                    ) : null}
                    {schedule
                      ? schedule.pt.member?.user.username ?? "PT"
                      : off
                      ? "OFF"
                      : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
