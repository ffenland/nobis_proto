// app/lib/services/pt-apply.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";
import { getEndTime } from "@/app/lib/utils/time.utils";

// 요일 매핑 제거됨 (weekDay 필드 사용 안함)

// ===== 스케줄링 관련 타입들 =====
export interface IScheduleSlot {
  date: Date;
  startTime: number;
  endTime: number;
}

export interface IDaySchedule {
  [dateKey: string]: number[]; // "2024-12-01": [900, 930, 1000] 형태
}

export interface IPtSchedule {
  date: Date;
  startTime: number;
  endTime: number;
  possible: boolean; // validation 결과
}

export interface ISchedulePattern {
  regular: boolean;
  count: number;
}

export interface IPtApplicationData {
  memberId: string;
  ptProductId: string;
  trainerId: string;
  startDate: Date;
  isRegular: boolean;
  chosenSchedule: IDaySchedule;
  fitnessCenterId: string; // 헬스장 ID 추가
  duration: number; // 수업 시간 (분 단위)
  message?: string;
}

// ===== 헬스장 및 PT 프로그램 조회 =====

// 헬스장 목록 조회 (영업시간 정보 포함)
// 처음 PT 등록시 1단계에 사용됨 전체 center에 대한 정보 불러오기 !

export const getFitnessCentersService = cache(async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers;
});

// 센터를 선택한 후 이루어지는 로직
// 센터에 소속된 트레이너들이 수업할 수 있는 PTproduct만 불러오기
export const getPtProgramsByCenterService = cache(async (centerId: string) => {
  const ptPrograms = await prisma.ptProduct.findMany({
    where: {
      trainer: {
        some: {
          fitnessCenterId: centerId,
        },
      },
      onSale: true,
      closedAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      totalCount: true,
      time: true,
      price: true,
      trainer: {
        where: {
          fitnessCenterId: centerId,
        },
        select: {
          id: true,
          introduce: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarMedia: {
                select: {
                  id: true,
                  publicUrl: true,
                  thumbnailUrl: true,
                  filename: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return ptPrograms;
});

// PENDING PT 체크 함수
export const getPendingPtDetails = cache(async (memberId: string) => {
  const pendingPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: PtState.PENDING,
    },
    select: {
      id: true,
      createdAt: true,
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPt;
});

// 트레이너 3개월 스케줄 조회
export const getTrainerScheduleService = cache(
  async (trainerId: string, targetDate: Date) => {
    const firstDateOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    );

    const threeMonthsLater = new Date(firstDateOfMonth);
    firstDateOfMonth.setHours(firstDateOfMonth.getHours() - 9); // UTC로 설정

    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    threeMonthsLater.setHours(threeMonthsLater.getHours() - 9); // UTC로 설정

    // 1. 트레이너 기존 PT 스케줄
    const existingSchedules = await prisma.ptSchedule.findMany({
      where: {
        date: {
          gte: firstDateOfMonth,
          lt: threeMonthsLater,
        },
        ptRecord: {
          some: {
            pt: {
              trainerId,
              state: {
                in: [PtState.PENDING, PtState.CONFIRMED],
              },
            },
          },
        },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    // 2. 트레이너 OFF (특정 날짜)
    const trainerOffs = await prisma.trainerOff.findMany({
      where: {
        trainerId,
        date: {
          gte: firstDateOfMonth,
          lt: threeMonthsLater,
        },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    // 3. 트레이너 OFF (반복) - 스키마에서 weekDay 제거됨으로 해당 기능 비활성화

    // 4. 트레이너 근무시간 정보 조회
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        workingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    return {
      existingSchedules,
      trainerOffs,
      workingHours: trainer?.workingHours || [],
      dateRange: {
        start: firstDateOfMonth,
        end: threeMonthsLater,
      },
    };
  }
);

// PT 신청 처리
export const applyPtService = async (data: IPtApplicationData) => {
  return await prisma.$transaction(async (tx) => {
    // 1. PT 생성 (Pt 모델의 실제 필드에 맞춤)
    const newPt = await tx.pt.create({
      data: {
        memberId: data.memberId,
        ptProductId: data.ptProductId,
        trainerId: data.trainerId,
        startDate: data.startDate,
        isRegular: data.isRegular,
        description: data.message || "",
        state: PtState.PENDING,
        trainerConfirmed: false,
      },
    });

    // 2. 스케줄 생성 - 연속된 시간대를 하나의 스케줄로 합치기
    const scheduleData = [];

    for (const [dateStr, times] of Object.entries(data.chosenSchedule)) {
      const date = new Date(dateStr);

      if (times.length > 0) {
        // 첫 번째 시간을 시작 시간으로, 마지막 시간에 30분을 더한 값을 종료 시간으로 설정
        const startTime = times[0];
        const endTime = getEndTime(times); // 마지막 슬롯에 30분 추가

        scheduleData.push({
          date,
          startTime,
          endTime,
        });
      }
    }

    // PT 스케줄 생성
    const createdSchedules = [];
    for (const schedule of scheduleData) {
      const ptSchedule = await tx.ptSchedule.create({
        data: schedule,
      });
      createdSchedules.push(ptSchedule);
    }

    // 3. PT 레코드 생성 (각 스케줄마다)
    for (const schedule of createdSchedules) {
      await tx.ptRecord.create({
        data: {
          ptId: newPt.id,
          ptScheduleId: schedule.id,
          fitnessCenterId: data.fitnessCenterId,
          memo: "",
        },
      });
    }

    return newPt;
  });
};

// ===== 유틸리티 함수들 =====

// ===== 타입 정의 =====
export type IFitnessCenters = Awaited<
  ReturnType<typeof getFitnessCentersService>
>;
export type IPtProgramsByCenter = Awaited<
  ReturnType<typeof getPtProgramsByCenterService>
>;
export type ITrainerSchedule = Awaited<
  ReturnType<typeof getTrainerScheduleService>
>;
export type IPtApplication = Awaited<ReturnType<typeof applyPtService>>;
export type IPendingPtDetails = Awaited<ReturnType<typeof getPendingPtDetails>>;

// API response type for pending PT check

export interface IPendingPt {
  id: string;
  ptTitle: string;
  trainerName: string;
  appliedDate: string;
  price: number;
  totalCount: number;
}
export interface IPendingPtCheck {
  hasPending: boolean;
  pendingPt?: {
    id: string;
    ptTitle: string;
    trainerName: string;
    appliedDate: string;
    price: number;
    totalCount: number;
  } | null;
}

// preschedulePT 서비스 함수 파라미터 타입
export interface IPreschedulePtData {
  memberId: string;
  chosenSchedule: IDaySchedule;
  centerId: string;
  ptProductId: string;
  pattern: ISchedulePattern;
  trainerId: string;
}

// preschedulePT 결과 타입
export interface IPreschedulePtResult {
  ptId: string;
  schedules: (IPtSchedule & { ptScheduleId?: string; ptRecordId?: string })[];
  successCount: number;
  failCount: number;
}

// ===== PRESCHEDULE PT 서비스 =====

export const preschedulePtService = async (
  data: IPreschedulePtData
): Promise<IPreschedulePtResult> => {
  return await prisma.$transaction(async (tx) => {
    // 1. PT 기본 정보 조회
    const ptProduct = await tx.ptProduct.findUniqueOrThrow({
      where: { id: data.ptProductId },
      select: { time: true, totalCount: true },
    });

    // 2. 스케줄 데이터를 IPtSchedule 형식으로 변환
    let ptSchedules: IPtSchedule[] = [];

    if (data.pattern.regular) {
      // 정기 수업: convertRegularScheduleToSlots 로직 사용
      ptSchedules = convertChosenScheduleToRegularSlots(
        data.chosenSchedule,
        ptProduct.totalCount
      );
    } else {
      // 비정기 수업: chosenSchedule 직접 변환
      ptSchedules = convertChosenScheduleToTempSlots(data.chosenSchedule);
    }

    // 디버깅용 로그
    console.log("=== 변환된 ptSchedules ===");
    console.log("ptSchedules 개수:", ptSchedules.length);
    ptSchedules.forEach((schedule, index) => {
      console.log(`Schedule ${index}:`, {
        date: schedule.date.toISOString(),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        possible: schedule.possible,
      });
    });

    // 3. 각 스케줄에 대해 validation 수행 (멤버 충돌 체크 포함)
    await validatePtSchedules(
      ptSchedules,
      data.trainerId,
      data.centerId,
      data.memberId
    );

    // 4. possible: true인 스케줄들로 Pt, PtRecord 생성
    const possibleSchedules = ptSchedules
      .filter((s) => s.possible)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (possibleSchedules.length === 0) {
      throw new Error("선택 가능한 일정이 없습니다.");
    }

    // 5. PT 생성
    const pt = await tx.pt.create({
      data: {
        memberId: data.memberId,
        ptProductId: data.ptProductId,
        trainerId: data.trainerId,
        startDate: possibleSchedules[0].date,
        isRegular: data.pattern.regular,
        state: PtState.PENDING,
        trainerConfirmed: false,
      },
    });

    // 6. PtSchedule 및 PtRecord 생성
    const scheduleResults = [];

    for (const schedule of possibleSchedules) {
      // PtSchedule 찾기 또는 생성
      let ptSchedule = await tx.ptSchedule.findFirst({
        where: {
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        },
      });

      if (!ptSchedule) {
        try {
          ptSchedule = await tx.ptSchedule.create({
            data: {
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
          });
        } catch (error: any) {
          // 중복 요청으로 인한 유니크 제약 조건 오류 처리
          if (error.code === "P2002") {
            // 다시 조회하여 기존 레코드 사용
            ptSchedule = await tx.ptSchedule.findFirst({
              where: {
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            });
          } else {
            throw error;
          }
        }
      }

      // ptSchedule이 null이면 에러 발생
      if (!ptSchedule) {
        throw new Error("PtSchedule 생성 또는 조회 실패");
      }

      // PtRecord 생성
      const ptRecord = await tx.ptRecord.create({
        data: {
          ptId: pt.id,
          ptScheduleId: ptSchedule.id,
          fitnessCenterId: data.centerId,
          memo: "",
        },
      });

      scheduleResults.push({
        ...schedule,
        ptScheduleId: ptSchedule.id,
        ptRecordId: ptRecord.id,
      });
    }

    return {
      ptId: pt.id,
      schedules: scheduleResults,
      successCount: possibleSchedules.length,
      failCount: ptSchedules.length - possibleSchedules.length,
    };
  });
};

// ===== 헬퍼 함수들 =====

// 정기 스케줄을 IPtSchedule 배열로 변환 (convertRegularScheduleToSlots 로직 기반)
const convertChosenScheduleToRegularSlots = (
  chosenSchedule: IDaySchedule,
  totalCount: number
): IPtSchedule[] => {
  const schedules: IPtSchedule[] = [];
  const dates = Object.keys(chosenSchedule).sort();

  if (dates.length === 0) return schedules;

  const firstDate = new Date(dates[0]);

  const weekPattern = Object.keys(chosenSchedule)
    .sort()
    .map((dateKey) => {
      const date = new Date(dateKey);
      const times = chosenSchedule[dateKey];
      return {
        dayOfWeek: date.getDay(),
        startTime: times[0],
        endTime: getEndTime(times),
      };
    });

  let currentWeek = 0;
  let generatedCount = 0;

  while (generatedCount < totalCount) {
    weekPattern.forEach((pattern) => {
      if (generatedCount >= totalCount) return;

      // 새로운 Date 객체 생성 및 안전한 날짜 계산
      const scheduleDate = new Date(firstDate);
      scheduleDate.setHours(0, 0, 0, 0); // 시간을 00:00:00.000으로 초기화
      const daysToAdd =
        currentWeek * 7 + (pattern.dayOfWeek - firstDate.getDay());
      
      // 첫 수업일보다 과거 날짜는 생성하지 않음
      if (daysToAdd < 0) {
        return; // 이 패턴은 건너뛰고 generatedCount도 증가시키지 않음
      }
      
      scheduleDate.setTime(
        scheduleDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
      );

      schedules.push({
        date: scheduleDate,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        possible: false, // 기본값
      });

      generatedCount++;
    });
    currentWeek++;
  }

  return schedules;
};

// 비정기 스케줄을 IPtSchedule 배열로 변환
const convertChosenScheduleToTempSlots = (
  chosenSchedule: IDaySchedule
): IPtSchedule[] => {
  const schedules: IPtSchedule[] = [];

  Object.keys(chosenSchedule).forEach((dateKey) => {
    const times = chosenSchedule[dateKey];
    if (times.length > 0) {
      schedules.push({
        date: new Date(dateKey),
        startTime: times[0],
        endTime: getEndTime(times),
        possible: false, // 기본값
      });
    }
  });

  return schedules;
};

// PT 스케줄 validation 수행
const validatePtSchedules = async (
  ptSchedules: IPtSchedule[],
  trainerId: string,
  centerId: string,
  memberId?: string // 옵셔널 파라미터로 멤버 ID 추가
): Promise<void> => {
  // 1. 트레이너 기존 스케줄과 충돌 체크
  const trainerConflicts = await checkTrainerConflicts(ptSchedules, trainerId);

  // 2. 트레이너 OFF 일정과 충돌 체크
  const trainerOffConflicts = await checkTrainerOffConflicts(
    ptSchedules,
    trainerId
  );

  // 3. 센터 휴무일과 충돌 체크
  const centerOffConflicts = await checkCenterOffConflicts(
    ptSchedules,
    centerId
  );

  // 4. 멤버 기존 스케줄과 충돌 체크 (memberId가 제공된 경우)
  let memberConflicts: number[] = [];
  if (memberId) {
    memberConflicts = await checkMemberConflicts(ptSchedules, memberId);
  }

  // 5. 각 스케줄의 possible 값 설정
  ptSchedules.forEach((schedule, index) => {
    const hasConflict =
      trainerConflicts.includes(index) ||
      trainerOffConflicts.includes(index) ||
      centerOffConflicts.includes(index) ||
      memberConflicts.includes(index);

    schedule.possible = !hasConflict;
  });
};

// 트레이너 기존 스케줄과 충돌 체크
const checkTrainerConflicts = async (
  ptSchedules: IPtSchedule[],
  trainerId: string
): Promise<number[]> => {
  const conflictIndexes: number[] = [];

  if (ptSchedules.length === 0) return conflictIndexes;

  // 대상 날짜들 추출
  const targetDates = ptSchedules.map((s) => s.date);

  // 기존 PT 스케줄 조회
  const existingPtSchedules = await prisma.ptSchedule.findMany({
    where: {
      OR: targetDates.map((date) => ({ date })),
      ptRecord: {
        some: {
          pt: {
            trainerId,
            state: {
              in: [PtState.PENDING, PtState.CONFIRMED],
            },
          },
        },
      },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  // 각 스케줄과 기존 스케줄 충돌 검사
  ptSchedules.forEach((schedule, index) => {
    const hasConflict = existingPtSchedules.some((existing) => {
      return (
        existing.date.getTime() === schedule.date.getTime() &&
        timeRangesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        )
      );
    });

    if (hasConflict) {
      conflictIndexes.push(index);
    }
  });

  return conflictIndexes;
};

// 트레이너 OFF 일정과 충돌 체크
const checkTrainerOffConflicts = async (
  ptSchedules: IPtSchedule[],
  trainerId: string
): Promise<number[]> => {
  const conflictIndexes: number[] = [];

  if (ptSchedules.length === 0) return conflictIndexes;

  // 트레이너 OFF 일정 조회 (특정 날짜만)
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      date: {
        in: ptSchedules.map((s) => s.date),
      },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  // 각 스케줄과 OFF 일정 충돌 검사
  ptSchedules.forEach((schedule, index) => {
    const hasConflict = trainerOffs.some((off) => {
      // 특정 날짜 OFF 체크만 수행
      if (off.date && off.date.getTime() === schedule.date.getTime()) {
        return timeRangesOverlap(
          schedule.startTime,
          schedule.endTime,
          off.startTime,
          off.endTime
        );
      }

      return false;
    });

    if (hasConflict) {
      conflictIndexes.push(index);
    }
  });

  return conflictIndexes;
};

// 센터 휴무일과 충돌 체크
const checkCenterOffConflicts = async (
  ptSchedules: IPtSchedule[],
  centerId: string
): Promise<number[]> => {
  const conflictIndexes: number[] = [];

  if (ptSchedules.length === 0) return conflictIndexes;

  // 센터 휴무일 조회
  const centerOffDays = await prisma.offDay.findMany({
    where: {
      fitnessCenterId: centerId,
      date: {
        in: ptSchedules.map((s) => s.date),
      },
    },
    select: {
      date: true,
    },
  });

  const offDayTimes = new Set(centerOffDays.map((off) => off.date.getTime()));

  // 각 스케줄과 센터 휴무일 충돌 검사
  ptSchedules.forEach((schedule, index) => {
    if (offDayTimes.has(schedule.date.getTime())) {
      conflictIndexes.push(index);
    }
  });

  return conflictIndexes;
};

// 멤버 기존 스케줄과 충돌 체크
const checkMemberConflicts = async (
  ptSchedules: IPtSchedule[],
  memberId: string
): Promise<number[]> => {
  const conflictIndexes: number[] = [];

  if (ptSchedules.length === 0) return conflictIndexes;

  // 대상 날짜들 추출
  const targetDates = ptSchedules.map((s) => s.date);

  // 기존 멤버 PT 스케줄 조회
  const existingMemberSchedules = await prisma.ptSchedule.findMany({
    where: {
      OR: targetDates.map((date) => ({ date })),
      ptRecord: {
        some: {
          pt: {
            memberId,
            state: {
              in: [PtState.PENDING, PtState.CONFIRMED],
            },
          },
        },
      },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  // 각 스케줄과 기존 멤버 스케줄 충돌 검사
  ptSchedules.forEach((schedule, index) => {
    const hasConflict = existingMemberSchedules.some((existing) => {
      return (
        existing.date.getTime() === schedule.date.getTime() &&
        timeRangesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        )
      );
    });

    if (hasConflict) {
      conflictIndexes.push(index);
    }
  });

  return conflictIndexes;
};

// 시간 범위 겹침 확인
const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// ===== PT 취소 서비스 =====

export const cancelPtService = async (
  ptId: string,
  memberId: string
): Promise<void> => {
  return await prisma.$transaction(async (tx) => {
    // 1. PT 존재 및 권한 확인
    const pt = await tx.pt.findFirst({
      where: {
        id: ptId,
        memberId,
        state: PtState.PENDING, // PENDING 상태만 취소 가능
      },
      include: {
        ptRecord: {
          include: {
            ptSchedule: true,
          },
        },
      },
    });

    if (!pt) {
      throw new Error("취소할 수 있는 PT를 찾을 수 없습니다.");
    }

    // 2. PtRecord 삭제
    await tx.ptRecord.deleteMany({
      where: {
        ptId: pt.id,
      },
    });

    // 3. PT 삭제
    await tx.pt.delete({
      where: {
        id: pt.id,
      },
    });

    // 5. PtSchedule 정리 (다른 PtRecord가 없는 경우에만 삭제)
    // 이 부분은 성능을 고려해 생략 (사용자 요구사항에 따라)
    // for (const record of pt.ptRecord) {
    //   const otherRecords = await tx.ptRecord.findMany({
    //     where: {
    //       ptScheduleId: record.ptScheduleId,
    //       id: { not: record.id },
    //     },
    //   });
    //
    //   if (otherRecords.length === 0) {
    //     await tx.ptSchedule.delete({
    //       where: { id: record.ptScheduleId },
    //     });
    //   }
    // }
  });
};
