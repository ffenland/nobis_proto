// app/lib/schedule.ts (수정 버전 - import 통일)
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// time.utils에서 addThirtyMinutes import (통일)
import { addThirtyMinutes } from "./utils/time.utils";
import { convertUTCtoKST } from "./utils";
import prisma from "./prisma";
import { serverError } from "./constants";

export interface ISchedule {
  date: Date;
  startTime: number;
  endTime: number;
}

// { "YYYY-MM-DD": [startTime, startTime, ...], ... }
// duration = 30 minutes
export interface DaySchedule {
  [date: string]: number[];
}

export interface WeekSchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: number;
  endTime: number;
}

export const dayOffTime = [
  600, 630, 700, 730, 800, 830, 900, 930, 1000, 1030, 1100, 1130, 1200, 1230,
  1300, 1330, 1400, 1430, 1500, 1530, 1600, 1630, 1700, 1730, 1800, 1830, 1900,
  1930, 2000, 2030, 2100, 2130, 2200, 2230, 2300, 2330,
];

export const createWeekScheduleFromChosenSchedule = ({
  chosenSchedule,
}: {
  chosenSchedule: DaySchedule;
}): WeekSchedule[] => {
  // chosenSchedule: { "YYYY-MM-DD": [startTime, startTime, ...], ... }
  const weekSchedule: WeekSchedule[] = Object.keys(chosenSchedule)
    .map((date) => {
      // date = "YYYY-MM-DD" 문자열.
      const day = dayjs(date).day();
      const startTime = chosenSchedule[date].sort()[0];
      const endTime = addThirtyMinutes(
        chosenSchedule[date].sort().reverse()[0]
      );
      return { day, startTime, endTime };
    })
    .sort((a, b) => {
      return a.day - b.day;
    });
  return weekSchedule;
};

// Date객체는 UTC기준이다.
// 나머지 코드는 기존과 동일...
