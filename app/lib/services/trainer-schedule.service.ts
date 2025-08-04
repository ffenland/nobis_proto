// app/lib/services/trainer-schedule.service.ts
import prisma from "@/app/lib/prisma";
import {
  calculateAttendanceStatus,
  type IPtRecordForAttendance,
} from "@/app/lib/utils/pt.utils";
import { PtState } from "@prisma/client";
import { convertKSTtoUTC } from "../utils";

// 시간 슬롯 타입 정의
export interface IOffTimeSlot {
  startTime: number;
  endTime: number;
  type: "TRAINER_OFF" | "CENTER_REGULAR_OFF" | "CENTER_SPECIAL_OFF";
  description?: string;
  isFullDay?: boolean;
}

export interface IPtTimeSlot {
  startTime: number;
  endTime: number;
  id: string;
  ptId: string;
  memberName: string;
  status: "ATTENDED" | "ABSENT" | "RESERVED" | "PENDING";
  itemsCount: number;
  ptState: PtState;
}

// 날짜별 스케줄 데이터
export interface IDayScheduleData {
  off: IOffTimeSlot[];
  pt: IPtTimeSlot[];
}

// 시간 범위 타입
export interface ITimeRange {
  startTime: number; // 가장 빠른 openTime (군대식 시간)
  endTime: number;   // 가장 늦은 closeTime (군대식 시간)
}

// 트레이너 근무시간 타입
export interface ITrainerWorkingHour {
  dayOfWeek: string;
  openTime: number;
  closeTime: number;
}

// 서비스 응답 타입 (날짜를 키로 하는 객체)
export interface ITrainerScheduleResponse {
  scheduleData: {
    [dateKey: string]: IDayScheduleData; // "2025-07-12" format
  };
  timeRange: ITimeRange;
  workingHours: ITrainerWorkingHour[];
}

/**
 * 트레이너 스케줄을 날짜별로 구조화하여 조회
 * @param trainerId 트레이너 ID
 * @param startDate 시작 날짜 (기본값: 오늘)
 * @param endDate 종료 날짜 (기본값: 오늘부터 12주 후)
 * @returns 날짜별로 구조화된 스케줄 데이터
 */
export const getTrainerScheduleService = async (
  trainerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ITrainerScheduleResponse> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 기본값 설정: 오늘부터 12주간
  const defaultStartDate = new Date(today);
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(defaultEndDate.getDate() + 12 * 7); // 12주 = 84일

  const rangeStart = startDate || defaultStartDate;
  const rangeEnd = endDate || defaultEndDate;

  // 시간 설정
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  // 1. 트레이너 정보 및 센터 정보, 근무시간 조회
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      id: true,
      fitnessCenterId: true,
      workingHours: {
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
        },
      },
    },
  });

  if (!trainer) {
    throw new Error("트레이너를 찾을 수 없습니다.");
  }

  // 1-1. 트레이너 근무시간으로부터 timeRange 계산
  const timeRange = calculateTimeRange(trainer.workingHours);

  // 2. PT 레코드 조회 (REJECTED 상태 제외)
  const ptRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId,
        state: {
          not: PtState.REJECTED, // REJECTED 상태 제외
        },
      },
      ptSchedule: {
        date: {
          gte: rangeStart,
          lte: rangeEnd,
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
          state: true,
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
    orderBy: {
      ptSchedule: {
        date: "asc",
      },
    },
  });

  // 3. 트레이너 OFF 일정 조회
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      date: {
        gte: convertKSTtoUTC(rangeStart),
        lte: convertKSTtoUTC(rangeEnd),
      },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  // 4. 센터 관련 휴무 정보 조회
  let centerInfo = null;
  let centerSpecialOffs: { date: Date }[] = [];

  if (trainer.fitnessCenterId) {
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

    centerSpecialOffs = await prisma.offDay.findMany({
      where: {
        fitnessCenterId: trainer.fitnessCenterId,
        date: {
          gte: convertKSTtoUTC(rangeStart),
          lte: convertKSTtoUTC(rangeEnd),
        },
      },
      select: {
        date: true,
      },
    });
  }

  // 5. 날짜별 데이터 구조 초기화
  const scheduleData: { [dateKey: string]: IDayScheduleData } = {};

  // 날짜 범위 내 모든 날짜 초기화
  const currentDate = new Date(rangeStart);
  while (currentDate <= rangeEnd) {
    const dateKey = formatDateKey(currentDate);
    scheduleData[dateKey] = {
      off: [],
      pt: [],
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 6. PT 데이터 분배
  const currentTime = new Date();

  ptRecords.forEach((record) => {
    const dateKey = formatDateKey(record.ptSchedule.date);

    if (scheduleData[dateKey]) {
      let displayName: string;
      let displayStatus: "ATTENDED" | "ABSENT" | "RESERVED" | "PENDING";

      // PT 상태에 따라 표시 방식 결정
      if (record.pt.state === PtState.PENDING) {
        displayName = "신청대기";
        displayStatus = "PENDING";
      } else {
        displayName = record.pt.member?.user.username || "Unknown";
        // 출석 상태 계산 (CONFIRMED, STARTED, FINISHED 상태에서만)
        displayStatus = calculateAttendanceStatus(
          {
            ptSchedule: record.ptSchedule,
            items: record.items,
          } as IPtRecordForAttendance,
          currentTime
        );
      }

      scheduleData[dateKey].pt.push({
        startTime: record.ptSchedule.startTime,
        endTime: record.ptSchedule.endTime,
        id: record.id,
        ptId: record.pt.id,
        memberName: displayName,
        status: displayStatus,
        itemsCount: record.items.length,
        ptState: record.pt.state,
      });
    }
  });

  // 7. OFF 데이터 분배
  // 7-1. 센터 정규 휴무 처리
  if (centerInfo) {
    const currentDate = new Date(rangeStart);

    while (currentDate <= rangeEnd) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = formatDateKey(currentDate);

      const centerOpeningHour = centerInfo.openingHours.find((oh) => {
        return weekDayStringToNumber(oh.dayOfWeek) === dayOfWeek;
      });

      if (centerOpeningHour?.isClosed && scheduleData[dateKey]) {
        scheduleData[dateKey].off.push({
          startTime: 0,
          endTime: 2400,
          type: "CENTER_REGULAR_OFF",
          description: "정기 휴무",
          isFullDay: true,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // 7-2. 센터 특별 휴무 처리
  centerSpecialOffs.forEach((off) => {
    const dateKey = formatDateKey(off.date);
    if (scheduleData[dateKey]) {
      scheduleData[dateKey].off.push({
        startTime: 0,
        endTime: 2400,
        type: "CENTER_SPECIAL_OFF",
        description: "특별 휴무",
        isFullDay: true,
      });
    }
  });

  // 7-3. 트레이너 개인 OFF 처리
  trainerOffs.forEach((off) => {
    const dateKey = formatDateKey(off.date);
    if (scheduleData[dateKey]) {
      scheduleData[dateKey].off.push({
        startTime: off.startTime,
        endTime: off.endTime,
        type: "TRAINER_OFF",
      });
    }
  });

  return {
    scheduleData,
    timeRange,
    workingHours: trainer.workingHours as ITrainerWorkingHour[],
  };
};

// 유틸리티 함수들

/**
 * 트레이너의 근무시간으로부터 시간 범위 계산
 * 비근무일(openTime=closeTime=0)은 제외하고 계산
 */
function calculateTimeRange(
  workingHours: Array<{
    dayOfWeek: string;
    openTime: number;
    closeTime: number;
  }>
): ITimeRange {
  // 근무하는 날짜만 필터링 (openTime과 closeTime이 모두 0인 경우 제외)
  const workingDays = workingHours.filter(
    (wh) => !(wh.openTime === 0 && wh.closeTime === 0)
  );

  // 근무하는 날이 없으면 전체 휴무 - 최소 범위 반환
  if (workingDays.length === 0) {
    return {
      startTime: 900,   // 최소 시간
      endTime: 900,     // 최소 시간 (동일하게 설정)
    };
  }

  // 가장 빠른 openTime과 가장 늦은 closeTime 찾기
  const minOpenTime = Math.min(...workingDays.map((wh) => wh.openTime));
  const maxCloseTime = Math.max(...workingDays.map((wh) => wh.closeTime));

  return {
    startTime: minOpenTime,
    endTime: maxCloseTime,
  };
}

function formatDateKey(date: Date): string {
  // KST 기준으로 날짜 포맷팅
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekDayStringToNumber(weekDay: string): number {
  const dayMap: { [key: string]: number } = {
    "SUN": 0,
    "MON": 1,
    "TUE": 2,
    "WED": 3,
    "THU": 4,
    "FRI": 5,
    "SAT": 6,
  };
  return dayMap[weekDay] ?? -1;
}

// 타입 추론을 위한 export
export type TrainerScheduleServiceResult = Awaited<
  ReturnType<typeof getTrainerScheduleService>
>;
