import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { addThirtyMinutes, convertUTCtoKST } from "./utils";
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
export const generateRegularSchedules = (
  weekSchedule: { day: number; startTime: number; endTime: number }[],
  totalCount: number,
  firstDay: dayjs.Dayjs
): ISchedule[] => {
  const weekOrder = weekSchedule.map((item) => item.day);
  const schedules: ISchedule[] = [];
  let currentDay = firstDay.startOf("day"); // 시간을 자정으로 초기화

  while (schedules.length < totalCount) {
    const day = currentDay.day();
    const currentDayIndex = weekOrder.indexOf(day);
    const scheduleForDay = weekSchedule.find((item) => item.day === day);
    if (scheduleForDay) {
      const { startTime, endTime } = scheduleForDay;
      schedules.push({
        date: currentDay.toDate(), // 최종적으로 Date 객체로 변환 UTC로 변환되기 땜시 -9시간됨
        startTime,
        endTime,
      });
    }

    if (currentDayIndex === weekOrder.length - 1) {
      // 다음주로 넘어감 (weekOrder[0]이 다음주 첫째 요일)
      currentDay = currentDay.add(1, "week").day(weekOrder[0]);
    } else {
      // 다음 요일로 넘어감 (weekOrder에서 day의 다음 요일)
      currentDay = currentDay.day(weekOrder[currentDayIndex + 1]);
    }
  }

  return schedules;
};

//---- 트레이너의 스케줄 가능여부 확인 ----
export const convertRegularChosenScheduleToDate = ({
  chosenSchedule,
  totalCount,
}: {
  chosenSchedule: DaySchedule;
  totalCount: number;
}): ISchedule[] | undefined => {
  // chosenSchedule: { "YYYY-MM-DD": [startTime, startTime, ...], ... }
  // totalCount: 총 세션 수

  if (Object.keys(chosenSchedule).length === 0) return; // 날짜가 선택되지 않았을 경우
  if (
    Object.keys(chosenSchedule).some(
      (date) => chosenSchedule[date].length === 0
    )
  )
    return; // 시간이 선택되지 않은 날짜가 있을 경우

  const firstDay = dayjs(
    Object.keys(chosenSchedule).sort((a, b) => {
      return a.localeCompare(b);
    })[0]
  );

  const weekSchedule = createWeekScheduleFromChosenSchedule({ chosenSchedule });

  return generateRegularSchedules(weekSchedule, totalCount, firstDay);
};

export const convertTempChosenScheduleToDate = ({
  chosenSchedule,
}: {
  chosenSchedule: DaySchedule;
}) => {
  // chosenSchedule: { "YYYY-MM-DD": [startTime, startTime, ...], ... }
  if (Object.keys(chosenSchedule).length === 0) return;
  if (
    Object.keys(chosenSchedule).some(
      (date) => chosenSchedule[date].length === 0
    )
  )
    return; // 시간이 선택되지 않은 날짜가 있을 경우
  const schedule: ISchedule[] = [];
  Object.keys(chosenSchedule).forEach((date) => {
    const startTime = chosenSchedule[date].sort()[0];
    const endTime = addThirtyMinutes(chosenSchedule[date].sort().reverse()[0]);
    schedule.push({
      date: dayjs(date).toDate(), //UTC
      startTime,
      endTime,
    });
  });
  return schedule;
};
export const isExistSchedule = async ({
  trainerId,
  date,
  startTime,
  endTime,
}: {
  trainerId: string;
  date: Date;
  startTime: number;
  endTime: number;
}) => {
  const trainerSchedule = await prisma.ptSchedule.findFirst({
    where: {
      date: date,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ptRecord: {
        some: {
          pt: {
            trainerId: trainerId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(trainerSchedule); // 이미 예약된 스케줄이 있으면 true, 없으면 false
};

export const createTrainerPossibleSchedules = async ({
  trainerId,
  schedules,
}: {
  trainerId: string;
  schedules: ISchedule[];
}) => {
  // 트레이너의 스케줄을 확인하고, 이미 예약되었을 경우 예약이 불가능한 스케줄을 반환
  const result = {
    success: [] as ISchedule[],
    fail: [] as ISchedule[],
  };

  // weekSchedule: [{ day: 0~6, startTime: number, endTime: number }, ...]
  // 어떤 요일 몇시에 하는지 정해진 정규 스케줄

  await Promise.all(
    schedules.map(async (schedule) => {
      const isExist = await isExistSchedule({ trainerId, ...schedule });
      if (isExist) {
        result.fail.push(schedule);
      } else {
        result.success.push(schedule);
      }
    })
  );

  return result;
};
//---- 트레이너의 스케줄 가능여부 확인 ----

type CreatePendingScheduleSuccess = {
  ok: true;
  data: {
    scheduleCount: number;
    ptScheduleCount: number;
    ptRecordCount: number;
  };
};

type CreatePendingScheduleFail = {
  ok: false;
  code: string;
};

type CreatePendingScheduleResult =
  | CreatePendingScheduleSuccess
  | CreatePendingScheduleFail;

export const createPendingSchedule = async ({
  schedules,
  ptId,
}: {
  schedules: ISchedule[];
  trainerId: string;
  ptId: string;
}): Promise<CreatePendingScheduleResult> => {
  // create PtRecord and PtSchedule
  try {
    // step 1 - create or find PtSchedule
    const ptSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        return prisma.ptSchedule.upsert({
          where: {
            date_startTime_endTime: {
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
          },
          update: {},
          create: {
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          },
          select: { id: true },
        });
      })
    );

    const ptRecordCreationResult = await prisma.ptRecord.createMany({
      data: ptSchedules.map(({ id }) => {
        return {
          ptId,
          ptScheduleId: id,
        };
      }),
    });

    return {
      ok: true,
      data: {
        scheduleCount: schedules.length,
        ptScheduleCount: ptSchedules.length,
        ptRecordCount: ptRecordCreationResult.count,
      },
    };
  } catch (error) {
    console.log("error", error);
    return { ok: false, code: `${serverError.prisma}` };
  }
};

// 시작시간과 종료시간값을 받아 30분단위의 시작시간으로 구성된 배열을 반환하는 함수
// 예시: 1000, 1200 => [1000, 1030, 1100, 1130]
export const getStartTimePoints = (
  startTime: number,
  endTime: number
): number[] => {
  const timeSlots: number[] = [];
  let currentHour = Math.floor(startTime / 100);
  let currentMinute = startTime % 100;

  while (currentHour * 100 + currentMinute < endTime) {
    timeSlots.push(currentHour * 100 + currentMinute);
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
  return timeSlots;
};

export const mergeDaySchedules = (
  schedule1: DaySchedule,
  schedule2: DaySchedule
): DaySchedule => {
  const mergedSchedule: DaySchedule = { ...schedule1 };

  for (const [date, numbers] of Object.entries(schedule2)) {
    if (mergedSchedule[date]) {
      mergedSchedule[date] = [
        ...new Set([...mergedSchedule[date], ...numbers]),
      ];
    } else {
      mergedSchedule[date] = numbers;
    }
  }

  return mergedSchedule;
};

// for calendar

export const getDaysOfWeek = (currentDay: dayjs.Dayjs) => {
  // currentWeek의 일요일부터 토요일까지의 dayjs 객체를 반환
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(currentDay.day(i));
  }
  return days;
};

export const getTimeSlots = ({
  openTime,
  closeTime,
}: {
  openTime: number;
  closeTime: number;
}) => {
  // 시작 시간들의 모임을 반환
  const slots = [];
  // 30분 단위로 나누기 위해 2를 곱함 (ex. 6:00 ~ 10:00 = 4시간 = 8개의 30분 단위)
  // max의 분값이 min의 분값과 같으면 0, 크면 1, 작으면 -1 단위씩 더해준다.

  for (let time = openTime; time < closeTime; time = addThirtyMinutes(time)) {
    slots.push(time);
  }
  return slots;
};

export const getTimeLength = ({
  startTime,
  openTime,
  closeTime,
  duration = 1,
}: {
  startTime: number;
  openTime: number;
  closeTime: number;
  duration?: number;
}) => {
  // duration에 따른 시간 구간(30분단위)을 획득한다.
  const timeLength: number[] = [];
  let currentTime = startTime;

  for (let i = 0; i < Math.floor(duration / 0.5); i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break; // 조건을 만족하지 않으면 루프를 종료합니다.
    }
    timeLength.push(currentTime);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeLength; // 항상 timeLength를 반환합니다.
};
