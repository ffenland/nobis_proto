// app/lib/services/trainer.service.ts
import prisma from "@/app/lib/prisma";
import { PtState, WeekDay } from "@prisma/client";
import {
  calculateCompletedSessions,
  findUpcomingSession,
  type IPtRecordForAttendance,
} from "@/app/lib/utils/pt.utils";

// 트레이너의 승인 대기 중인 PT 목록 조회
export const getPendingPtsService = async (trainerId: string) => {
  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.PENDING, // PENDING 상태만
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      createdAt: true,
      description: true,
      isRegular: true,
      member: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      ptRecord: {
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
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPts.map((pt) => ({
    ...pt,
    startDate: pt.startDate.toISOString(),
    createdAt: pt.createdAt.toISOString(),
    ptSchedule: pt.ptRecord.map((record) => ({
      ...record.ptSchedule,
      date: record.ptSchedule.date.toISOString(),
    })),
  }));
};

// PT 승인 처리
export const approvePtApplicationService = async (
  ptId: string,
  trainerId: string
) => {
  // 1. PT가 해당 트레이너의 PENDING 상태인지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      state: PtState.PENDING,
    },
  });

  if (!pt) {
    throw new Error("승인할 수 없는 PT 신청입니다.");
  }

  // 2. PT 승인 처리
  const approvedPt = await prisma.pt.update({
    where: { id: ptId },
    data: {
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
      description: "트레이너가 승인한 PT입니다.",
    },
  });

  // 3. PT Record는 이미 생성되어 있으므로 별도 처리 불필요
  // (attended 필드가 없어졌으므로 updateMany 제거)
  const ptRecordsCount = await prisma.ptRecord.count({
    where: { ptId },
  });

  return {
    pt: approvedPt,
    recordsCreated: ptRecordsCount,
  };
};

// PT 거절 처리
export const rejectPtApplicationService = async (
  ptId: string,
  trainerId: string,
  reason?: string
) => {
  // 1. PT와 관련된 정보 조회
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      state: PtState.PENDING,
    },
    include: {
      ptRecord: {
        include: {
          ptSchedule: true,
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
    },
  });

  if (!pt) {
    throw new Error("거절할 수 없는 PT 신청입니다.");
  }

  // 2. 스케줄 정보를 문자열로 생성
  const scheduleInfo = pt.ptRecord
    .map((record) => {
      const date = new Date(record.ptSchedule.date);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");

      const startHour = Math.floor(record.ptSchedule.startTime / 100);
      const startMinute = record.ptSchedule.startTime % 100;
      const endHour = Math.floor(record.ptSchedule.endTime / 100);
      const endMinute = record.ptSchedule.endTime % 100;

      const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute
        .toString()
        .padStart(2, "0")}`;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}`;

      return `${year}년 ${month}월 ${day}일 ${startTime}~${endTime}`;
    })
    .join(", ");

  // 3. 트랜잭션으로 처리
  const result = await prisma.$transaction(async (tx) => {
    // PtRejectInfo 생성
    await tx.ptRejectInfo.create({
      data: {
        ptId,
        reason: reason || "트레이너가 거절한 PT입니다.",
        schedule: scheduleInfo,
      },
    });

    // 모든 PtRecord 삭제 (스케줄 시간대 해제)
    await tx.ptRecord.deleteMany({
      where: { ptId },
    });

    // PT 상태를 REJECTED로 변경
    const rejectedPt = await tx.pt.update({
      where: { id: ptId },
      data: {
        state: PtState.REJECTED,
      },
    });

    return rejectedPt;
  });

  return result;
};

// 트레이너 대시보드 통계
export const getTrainerDashboardStatsService = async (trainerId: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentTime = new Date();

  // 트레이너 정보와 매니저 프로필 확인
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      userId: true,
      user: {
        select: {
          username: true,
          managerProfile: {
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  const hasManagerProfile = !!trainer?.user?.managerProfile;
  const username = trainer?.user?.username || "";

  // 승인 대기 중인 PT 개수
  const pendingCount = await prisma.pt.count({
    where: {
      trainerId,
      state: PtState.PENDING,
    },
  });

  // 진행 중인 PT 개수 (CONFIRMED 상태이면서 아직 완료되지 않은 것)
  const confirmedPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          totalCount: true,
        },
      },
      ptRecord: {
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
            },
          },
          items: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // pt.utils를 사용하여 진행 중인 PT 계산
  const activeCount = confirmedPts.filter((pt) => {
    const completedSessions = calculateCompletedSessions(
      pt.ptRecord.map((record) => ({
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
    );
    return completedSessions < pt.ptProduct.totalCount;
  }).length;

  // 오늘 수업 개수
  const todayClasses = await prisma.ptRecord.count({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      ptSchedule: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 이번 달 완료된 수업 개수 (pt.utils 사용)
  const thisMonthRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      ptSchedule: {
        date: {
          gte: thisMonthStart,
        },
      },
    },
    select: {
      id: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
        },
      },
      items: {
        select: {
          id: true,
        },
      },
    },
  });

  const thisMonthCompleted = calculateCompletedSessions(
    thisMonthRecords.map((record) => ({
      ptSchedule: record.ptSchedule,
      items: record.items,
    })),
    currentTime
  );

  // 오늘의 수업 일정
  const todaySchedule = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      ptSchedule: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    select: {
      id: true,
      pt: {
        select: {
          id: true,
          ptProduct: {
            select: {
              title: true,
              time: true,
            },
          },
          member: {
            select: {
              id: true,
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
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
    },
    orderBy: {
      ptSchedule: {
        startTime: "asc",
      },
    },
  });

  // 승인 대기 중인 PT 목록 (간단한 정보)
  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.PENDING,
    },
    select: {
      id: true,
      createdAt: true,
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
        },
      },
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
    orderBy: {
      createdAt: "desc",
    },
    take: 5, // 최대 5개만
  });

  return {
    pendingCount,
    activeCount,
    todayClasses,
    thisMonthCompleted,
    hasManagerProfile,
    username,
    todaySchedule: todaySchedule.map((record) => ({
      ...record,
      ptSchedule: {
        ...record.ptSchedule,
        date: record.ptSchedule.date.toISOString(),
      },
    })),
    pendingPts: pendingPts.map((pt) => ({
      ...pt,
      createdAt: pt.createdAt.toISOString(),
    })),
  };
};

// 트레이너 프로필 수정용 조회
export const getTrainerProfileForEditService = async (trainerId: string) => {
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      id: true,
      introduce: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatarImageId: true,
          avatarImage: {
            select: {
              id: true,
              cloudflareId: true,
              originalName: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!trainer) {
    throw new Error("트레이너 정보를 찾을 수 없습니다.");
  }

  return {
    id: trainer.id,
    userId: trainer.user.id,
    username: trainer.user.username,
    email: trainer.user.email,
    introduce: trainer.introduce,
    avatarImageId: trainer.user.avatarImageId,
    avatarImage: trainer.user.avatarImage,
  };
};

// 트레이너 프로필 업데이트
export const updateTrainerProfileService = async (
  trainerId: string,
  data: {
    username?: string;
    introduce?: string;
    avatarImageId?: string | null;
  }
) => {
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      userId: true,
      user: {
        select: {
          username: true,
          avatarImageId: true,
        },
      },
    },
  });

  if (!trainer) {
    throw new Error("트레이너 정보를 찾을 수 없습니다.");
  }

  // username 중복 검사 (변경된 경우만)
  if (data.username && data.username !== trainer.user.username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: data.username,
        id: { not: trainer.userId },
      },
    });

    if (existingUser) {
      throw new Error("이미 사용중인 사용자명입니다.");
    }
  }

  // 트랜잭션으로 안전하게 업데이트
  const result = await prisma.$transaction(async (tx) => {
    // User 테이블 업데이트
    const updatedUser = await tx.user.update({
      where: { id: trainer.userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.avatarImageId !== undefined && {
          avatarImageId: data.avatarImageId,
        }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarImageId: true,
        avatarImage: {
          select: {
            id: true,
            cloudflareId: true,
            originalName: true,
            type: true,
          },
        },
      },
    });

    // Trainer 테이블 업데이트
    const updatedTrainer = await tx.trainer.update({
      where: { id: trainerId },
      data: {
        ...(data.introduce !== undefined && { introduce: data.introduce }),
      },
      select: {
        id: true,
        introduce: true,
      },
    });

    return {
      id: updatedTrainer.id,
      userId: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      introduce: updatedTrainer.introduce,
      avatarImageId: updatedUser.avatarImageId,
      avatarImage: updatedUser.avatarImage,
    };
  });

  return result;
};

// username 중복 확인 (실시간 검증용)
export const checkUsernameAvailabilityService = async (
  username: string,
  currentUserId: string
) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      username,
      id: { not: currentUserId },
    },
  });

  return {
    available: !existingUser,
    message: existingUser
      ? "이미 사용중인 사용자명입니다."
      : "사용 가능한 사용자명입니다.",
  };
};

// 타입 정의
export type ITrainerPendingPts = Awaited<
  ReturnType<typeof getPendingPtsService>
>;

export type ITrainerDashboardStats = Awaited<
  ReturnType<typeof getTrainerDashboardStatsService>
>;

export type ITrainerProfileForEdit = Awaited<
  ReturnType<typeof getTrainerProfileForEditService>
>;
export type IUsernameAvailability = Awaited<
  ReturnType<typeof checkUsernameAvailabilityService>
>;

// 오프 일정 조회
export const getTrainerOffSchedulesService = async (trainerId: string) => {
  const offSchedules = await prisma.trainerOff.findMany({
    where: { trainerId },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return offSchedules.map((schedule) => ({
    ...schedule,
    date: schedule.date ? schedule.date.toISOString() : null,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  }));
};

// 오프 일정 생성 (특정 날짜만)
export const createTrainerOffScheduleService = async (
  trainerId: string,
  data: {
    startDate: string; // ISO string (단일 날짜 또는 범위 시작)
    endDate?: string; // ISO string (범위 종료)
    dateType?: "single" | "range"; // 단일/범위 구분
    startTime: number;
    endTime: number;
  }
) => {
  // 시간 검증
  // 종일 휴무인 경우 (0,0) 허용
  if (data.startTime === 0 && data.endTime === 0) {
    // 종일 휴무는 유효함
  } else {
    // 일반적인 시간 검증 (군대식 시간 형식)
    if (data.startTime >= data.endTime) {
      throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
    }
    if (
      data.startTime < 0 ||
      data.startTime > 2359 ||
      data.endTime < 0 ||
      data.endTime > 2400
    ) {
      throw new Error("시간은 0-2359 범위여야 합니다.");
    }

    // 분 단위 검증 (00, 30만 허용)
    const startMinute = data.startTime % 100;
    const endMinute = data.endTime % 100;
    if (
      (startMinute !== 0 && startMinute !== 30) ||
      (endMinute !== 0 && endMinute !== 30)
    ) {
      throw new Error("시간은 30분 단위로만 설정할 수 있습니다.");
    }
  }

  // 특정 날짜 처리
  if (data.startDate) {
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : startDate;

    // 날짜 범위 검증
    if (data.dateType === "range" && data.endDate && startDate > endDate) {
      throw new Error("종료 날짜는 시작 날짜보다 늦어야 합니다.");
    }

    // 생성할 날짜 목록 계산
    const datesToCreate: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      datesToCreate.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 각 날짜에 대해 중복 검사
    for (const date of datesToCreate) {
      const existingSchedule = await prisma.trainerOff.findFirst({
        where: {
          trainerId,
          date: date,
          OR: [
            // 새 일정의 시작시간이 기존 일정 내에 있는 경우
            {
              AND: [
                { startTime: { lte: data.startTime } },
                { endTime: { gt: data.startTime } },
              ],
            },
            // 새 일정의 종료시간이 기존 일정 내에 있는 경우
            {
              AND: [
                { startTime: { lt: data.endTime } },
                { endTime: { gte: data.endTime } },
              ],
            },
            // 새 일정이 기존 일정을 완전히 포함하는 경우
            {
              AND: [
                { startTime: { gte: data.startTime } },
                { endTime: { lte: data.endTime } },
              ],
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (existingSchedule) {
        throw new Error(
          `${date.toLocaleDateString(
            "ko-KR"
          )} 해당 시간대에 이미 오프 일정이 등록되어 있습니다.`
        );
      }
    }

    // 트랜잭션으로 모든 날짜에 대한 오프 일정 생성
    const createdSchedules = await prisma.$transaction(
      datesToCreate.map((date) =>
        prisma.trainerOff.create({
          data: {
            trainerId,
            date: date,
            startTime: data.startTime,
            endTime: data.endTime,
          },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      )
    );

    return createdSchedules.map((schedule) => ({
      ...schedule,
      date: schedule.date ? schedule.date.toISOString() : null,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    }));
  }

  throw new Error("올바른 오프 일정 데이터가 제공되지 않았습니다.");
};

// 오프 일정 삭제
export const deleteTrainerOffScheduleService = async (
  offId: string,
  trainerId: string
) => {
  // 해당 트레이너의 오프 일정인지 확인
  const schedule = await prisma.trainerOff.findFirst({
    where: {
      id: offId,
      trainerId,
    },
    select: {
      id: true,
    },
  });

  if (!schedule) {
    throw new Error("삭제할 수 없는 오프 일정입니다.");
  }

  await prisma.trainerOff.delete({
    where: { id: offId },
  });

  return { success: true, message: "오프 일정이 삭제되었습니다." };
};

// 타입 정의

export type ITrainerOffSchedule = Awaited<
  ReturnType<typeof getTrainerOffSchedulesService>
>[number];
export type ITrainerOffSchedules = Awaited<
  ReturnType<typeof getTrainerOffSchedulesService>
>;
