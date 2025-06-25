"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "../../lib/session";
import { convertKSTtoUTC } from "../../lib/utils";
import { redirect } from "next/navigation";
import { calculateAttendanceStatus } from "@/app/lib/utils/pt.utils";
import { logout } from "@/app/(auth)/authActions";

export interface IScheduleItem {
  id: string;
  status: "ATTENDED" | "ABSENT" | "RESERVED";
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
}

export interface IOffItem {
  type: "TRAINER_OFF" | "CENTER_REGULAR_OFF" | "CENTER_SPECIAL_OFF";
  date: Date;
  startTime: number;
  endTime: number;
  description?: string;
  isFullDay?: boolean; // 하루 종일 휴무인지 여부
}

export interface IWeeklyScheduleData {
  schedules: IScheduleItem[];
  offs: IOffItem[];
  hasNextMonth: boolean;
  hasPrevMonth: boolean;
}

export const getWeeklySchedule = async (
  startDate: Date,
  loadMonths: number = 1
): Promise<IWeeklyScheduleData> => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  // 1. 트레이너 정보 조회 (센터 정보 포함)
  const trainer = await prisma.trainer.findUnique({
    where: { id: roleId },
    select: {
      fitnessCenterId: true,
    },
  });

  // 트레이너가 없으면 로그아웃 후 로그인 페이지로 리다이렉트
  if (!trainer) {
    await logout();
    redirect("/login");
  }

  // 2. 조회 범위 계산 (현재 주부터 loadMonths개월)
  const weekStart = new Date(startDate);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 아니면 1-day
  weekStart.setDate(weekStart.getDate() + diff); // 월요일로 설정
  weekStart.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(weekStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + loadMonths);
  rangeEnd.setHours(23, 59, 59, 999);

  // 3. 3개월 제한 확인
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const isAtMaxRange = rangeEnd >= maxDate;

  // 4. 이전 데이터 존재 확인
  const prevMonthStart = new Date(weekStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const hasPrevData = prevMonthStart >= new Date();

  // 5. PT 스케줄 조회 (pt.utils를 사용하기 위해 items도 포함)
  const schedules = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId: roleId,
        state: "CONFIRMED",
      },
      ptSchedule: {
        date: {
          gte: convertKSTtoUTC(weekStart),
          lte: convertKSTtoUTC(rangeEnd),
        },
      },
    },
    select: {
      id: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      items: {
        select: {
          id: true,
        },
      },
      pt: {
        select: {
          id: true,
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 6. pt.utils를 사용하여 출석 상태 계산
  const currentTime = new Date();
  const schedulesWithStatus: IScheduleItem[] = schedules.map((schedule) => {
    const attendanceStatus = calculateAttendanceStatus(
      {
        ptSchedule: schedule.ptSchedule,
        items: schedule.items,
      },
      currentTime
    );

    return {
      id: schedule.id,
      status: attendanceStatus,
      ptSchedule: schedule.ptSchedule,
      pt: schedule.pt,
    };
  });

  // 7. 트레이너 개인 오프 일정 조회 (반복 오프 + 1회성 오프)
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId: roleId,
      OR: [
        // 1회성 오프: 특정 날짜
        {
          date: {
            gte: convertKSTtoUTC(weekStart),
            lte: convertKSTtoUTC(rangeEnd),
          },
        },
        // 반복 오프: weekDay가 설정된 것들
        {
          weekDay: { not: null },
        },
      ],
    },
    select: {
      date: true,
      weekDay: true,
      startTime: true,
      endTime: true,
    },
  });

  // 8. 모든 오프 일정을 저장할 배열
  const allOffs: IOffItem[] = [];

  // 9. 센터 정보가 있는 경우에만 센터 관련 휴무 처리
  let centerInfo = null;
  let centerSpecialOffs: { date: Date }[] = [];

  if (trainer.fitnessCenterId) {
    // 피트니스 센터 정보 및 영업시간 조회
    centerInfo = await prisma.fitnessCenter.findUnique({
      where: { id: trainer.fitnessCenterId },
      select: {
        id: true,
        openingHours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
        },
      },
    });

    // 피트니스 센터 특별 휴무 일정 조회 (OffDay 모델)
    // ⚠️ OffDay는 특정 날짜만 저장하므로 weekDay 필드 사용 안함
    centerSpecialOffs = await prisma.offDay.findMany({
      where: {
        fitnessCenterId: trainer.fitnessCenterId,
        date: {
          gte: convertKSTtoUTC(weekStart),
          lte: convertKSTtoUTC(rangeEnd),
        },
      },
      select: {
        date: true,
      },
    });
  }

  // 10. 조회 범위 내의 모든 날짜에 대해 반복 처리
  for (let d = new Date(weekStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const currentDate = new Date(d);

    // 10-1. 센터 정규 휴무 (openingHours에서 isClosed=true인 요일)
    if (centerInfo) {
      const centerOpeningHour = centerInfo.openingHours.find(
        (oh) => weekDayToNumber(oh.dayOfWeek) === dayOfWeek
      );

      if (centerOpeningHour?.isClosed) {
        allOffs.push({
          type: "CENTER_REGULAR_OFF",
          date: currentDate,
          startTime: 0, // 하루 종일
          endTime: 2400,
          description: "정기 휴무",
          isFullDay: true,
        });
      }
    }

    // 10-2. 트레이너 반복 개인 오프 (weekDay가 있는 것들)
    trainerOffs.forEach((off) => {
      if (off.weekDay && dayOfWeek === weekDayToNumber(off.weekDay)) {
        allOffs.push({
          type: "TRAINER_OFF",
          date: currentDate,
          startTime: off.startTime,
          endTime: off.endTime,
        });
      }
    });
  }

  // 11. 트레이너 1회성 개인 오프 추가 (date가 있는 것들)
  trainerOffs
    .filter((off) => off.date)
    .forEach((off) => {
      allOffs.push({
        type: "TRAINER_OFF",
        date: off.date!,
        startTime: off.startTime,
        endTime: off.endTime,
      });
    });

  // 12. 센터 1회성 특별 휴무 추가 (OffDay 모델은 하루종일 휴무로 처리)
  centerSpecialOffs.forEach((off) => {
    allOffs.push({
      type: "CENTER_SPECIAL_OFF",
      date: off.date,
      startTime: 0, // 하루 종일
      endTime: 2400,
      description: "특별 휴무",
      isFullDay: true,
    });
  });

  return {
    schedules: schedulesWithStatus,
    offs: allOffs,
    hasNextMonth: !isAtMaxRange,
    hasPrevMonth: hasPrevData,
  };
};

// 주별 스케줄 조회 (단일 주 - 기존 호환성 유지)
export const getSingleWeekSchedule = async (
  startDate: Date
): Promise<Omit<IWeeklyScheduleData, "hasNextMonth" | "hasPrevMonth">> => {
  const data = await getWeeklySchedule(startDate, 1);
  return {
    schedules: data.schedules,
    offs: data.offs,
  };
};

// 다음 월 데이터 로드
export const loadNextMonthData = async (
  currentStartDate: Date
): Promise<Omit<IWeeklyScheduleData, "hasPrevMonth">> => {
  const nextMonthStart = new Date(currentStartDate);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const data = await getWeeklySchedule(nextMonthStart, 1);
  return {
    schedules: data.schedules,
    offs: data.offs,
    hasNextMonth: data.hasNextMonth,
  };
};

// 이전 월 데이터 로드
export const loadPrevMonthData = async (
  currentStartDate: Date
): Promise<Omit<IWeeklyScheduleData, "hasNextMonth">> => {
  const prevMonthStart = new Date(currentStartDate);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  const data = await getWeeklySchedule(prevMonthStart, 1);
  return {
    schedules: data.schedules,
    offs: data.offs,
    hasPrevMonth: data.hasPrevMonth,
  };
};

// weekDay enum을 숫자로 변환하는 헬퍼 함수
function weekDayToNumber(weekDay: string): number {
  switch (weekDay) {
    case "SUN":
      return 0;
    case "MON":
      return 1;
    case "TUE":
      return 2;
    case "WED":
      return 3;
    case "THU":
      return 4;
    case "FRI":
      return 5;
    case "SAT":
      return 6;
    default:
      return -1;
  }
}
