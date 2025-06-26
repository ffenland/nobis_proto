// app/lib/services/schedule-view.service.ts
import prisma from "@/app/lib/prisma";
import {
  calculateAttendanceStatus,
  type IPtRecordForAttendance,
} from "@/app/lib/utils/pt.utils";
import { WeekDay } from "@prisma/client";
import { convertKSTtoUTC } from "../utils";

// 스케줄 아이템 타입
export interface IScheduleViewItem {
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

// 휴무 아이템 타입
export interface IOffViewItem {
  type: "TRAINER_OFF" | "CENTER_REGULAR_OFF" | "CENTER_SPECIAL_OFF";
  date: Date;
  startTime: number;
  endTime: number;
  description?: string;
  isFullDay?: boolean;
}

// 서비스 응답 타입
export interface IScheduleViewData {
  schedules: IScheduleViewItem[];
  offs: IOffViewItem[];
}

/**
 * 트레이너의 지정된 기간 스케줄을 조회합니다.
 * @param trainerId 트레이너 ID
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 */
export const getTrainerScheduleViewService = async (
  trainerId: string,
  startDate: Date,
  endDate: Date
): Promise<IScheduleViewData> => {
  // 1. 조회 범위 설정
  const rangeStart = new Date(startDate);
  rangeStart.setHours(0, 0, 0, 0);

  const rangeEnd = new Date(endDate);
  rangeEnd.setHours(0, 0, 0, 0);

  // endDate 다음 날을 계산 (endDate 포함하기 위해)
  const rangeEndExclusive = new Date(rangeEnd);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  // 2. 트레이너 정보 조회 (센터 정보 포함)
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      id: true,
      fitnessCenterId: true,
    },
  });

  if (!trainer) {
    throw new Error("트레이너를 찾을 수 없습니다.");
  }

  // 3. PT 스케줄 조회
  const ptRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId,
        state: "CONFIRMED",
      },
      ptSchedule: {
        date: {
          gte: rangeStart,
          lt: rangeEndExclusive, // endDate 포함하되 다음 날은 제외
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
    orderBy: {
      ptSchedule: {
        date: "asc",
      },
    },
  });

  // 4. 출석 상태 계산
  const currentTime = new Date();
  const schedulesWithStatus: IScheduleViewItem[] = ptRecords.map((record) => {
    const attendanceStatus = calculateAttendanceStatus(
      {
        ptSchedule: record.ptSchedule,
        items: record.items,
      } as IPtRecordForAttendance,
      currentTime
    );

    return {
      id: record.id,
      status: attendanceStatus,
      ptSchedule: record.ptSchedule,
      pt: record.pt,
    };
  });

  // 5. 트레이너 개인 오프 일정 조회
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      OR: [
        // 특정 날짜 오프
        {
          date: {
            gte: convertKSTtoUTC(rangeStart),
            lt: convertKSTtoUTC(rangeEndExclusive),
          },
        },
        // 반복 오프 (weekDay가 설정된 것들)
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

  // 6. 모든 오프 일정을 저장할 배열
  const allOffs: IOffViewItem[] = [];

  // 7. 센터 관련 휴무 처리 (센터가 있는 경우에만)
  let centerInfo = null;
  let centerSpecialOffs: { date: Date }[] = [];

  if (trainer.fitnessCenterId) {
    // 센터 정보 및 영업시간 조회
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

    // 센터 특별 휴무 조회
    centerSpecialOffs = await prisma.offDay.findMany({
      where: {
        fitnessCenterId: trainer.fitnessCenterId,
        date: {
          gte: convertKSTtoUTC(rangeStart),
          lt: convertKSTtoUTC(rangeEndExclusive),
        },
      },
      select: {
        date: true,
      },
    });
  }

  // 8. 조회 범위 내의 모든 날짜에 대해 반복 처리
  for (
    let d = new Date(rangeStart);
    d <= rangeEnd;
    d.setDate(d.getDate() + 1)
  ) {
    const dayOfWeek = d.getDay();
    const currentDate = new Date(d);

    // 8-1. 센터 정규 휴무 처리
    if (centerInfo) {
      const centerOpeningHour = centerInfo.openingHours.find(
        (oh) => weekDayToNumber(oh.dayOfWeek) === dayOfWeek
      );

      if (centerOpeningHour?.isClosed) {
        allOffs.push({
          type: "CENTER_REGULAR_OFF",
          date: currentDate,
          startTime: 0,
          endTime: 2400,
          description: "정기 휴무",
          isFullDay: true,
        });
      }
    }

    // 8-2. 트레이너 반복 개인 오프 처리
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

  // 9. 트레이너 특정 날짜 오프 추가
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

  // 10. 센터 특별 휴무 추가
  centerSpecialOffs.forEach((off) => {
    allOffs.push({
      type: "CENTER_SPECIAL_OFF",
      date: off.date,
      startTime: 0,
      endTime: 2400,
      description: "특별 휴무",
      isFullDay: true,
    });
  });

  return {
    schedules: schedulesWithStatus,
    offs: allOffs,
  };
};

// WeekDay enum을 숫자로 변환하는 헬퍼 함수
function weekDayToNumber(weekDay: WeekDay): number {
  switch (weekDay) {
    case WeekDay.SUN:
      return 0;
    case WeekDay.MON:
      return 1;
    case WeekDay.TUE:
      return 2;
    case WeekDay.WED:
      return 3;
    case WeekDay.THU:
      return 4;
    case WeekDay.FRI:
      return 5;
    case WeekDay.SAT:
      return 6;
    default:
      return -1;
  }
}

// 타입 추론
export type ITrainerScheduleViewData = Awaited<
  ReturnType<typeof getTrainerScheduleViewService>
>;
