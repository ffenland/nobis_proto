import prisma from "@/app/lib/prisma";
import { WeekDay } from "@prisma/client";

// 센터 배정을 위한 트레이너 목록 조회
export const getTrainersForCenterAssignment = async (centerId: string) => {
  // 센터 정보와 defaultWorkingHours 조회
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      title: true,
      defaultWorkingHours: {
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

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // 요일별 중복 검사
  const dayOfWeekCount = new Map<string, number>();
  center.defaultWorkingHours.forEach((wh) => {
    const count = dayOfWeekCount.get(wh.dayOfWeek) || 0;
    dayOfWeekCount.set(wh.dayOfWeek, count + 1);
  });

  const duplicateDays = Array.from(dayOfWeekCount.entries())
    .filter(([, count]) => count > 1)
    .map(([day]) => day);

  // 모든 트레이너 목록 조회
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatarImage: {
            select: {
              cloudflareId: true,
            },
          },
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      fitnessCenterId: true,
    },
    orderBy: {
      user: {
        username: "asc",
      },
    },
  });

  return {
    center: {
      id: center.id,
      title: center.title,
      defaultWorkingHours: center.defaultWorkingHours,
      hasDuplicateDays: duplicateDays.length > 0,
      duplicateDays,
    },
    trainers: trainers.map((trainer) => ({
      ...trainer,
      isCurrentlyAssigned: trainer.fitnessCenterId === centerId,
    })),
  };
};

// 트레이너들을 센터에 배정하고 workingHours 동기화
export const assignTrainersToCenter = async (
  centerId: string,
  trainerIds: string[]
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 센터의 defaultWorkingHours 조회
    const center = await tx.fitnessCenter.findUnique({
      where: { id: centerId },
      select: {
        id: true,
        title: true,
        defaultWorkingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });

    if (!center) {
      throw new Error("센터를 찾을 수 없습니다.");
    }

    // 2. 현재 센터에 소속된 트레이너 목록 조회
    const currentTrainers = await tx.trainer.findMany({
      where: { fitnessCenterId: centerId },
      select: { id: true },
    });

    const currentTrainerIds = currentTrainers.map((t) => t.id);
    
    // 3. 추가/제거할 트레이너 식별
    const trainersToAdd = trainerIds.filter(
      (id) => !currentTrainerIds.includes(id)
    );
    const trainersToRemove = currentTrainerIds.filter(
      (id) => !trainerIds.includes(id)
    );

    // 4. 모든 요일에 대한 0시간 WorkingHour 준비
    const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as WeekDay[];
    const zeroHourIds: Record<string, string> = {};

    for (const day of weekDays) {
      let zeroHour = await tx.workingHour.findUnique({
        where: {
          dayOfWeek_openTime_closeTime: {
            dayOfWeek: day,
            openTime: 0,
            closeTime: 0,
          },
        },
      });

      if (!zeroHour) {
        zeroHour = await tx.workingHour.create({
          data: {
            dayOfWeek: day,
            openTime: 0,
            closeTime: 0,
          },
        });
      }

      zeroHourIds[day] = zeroHour.id;
    }

    // 5. 센터의 defaultWorkingHours를 기준으로 최종 workingHour IDs 준비
    const finalWorkingHourIds: string[] = [];
    const defaultHoursByDay = new Map(
      center.defaultWorkingHours.map((h) => [h.dayOfWeek, h])
    );

    for (const day of weekDays) {
      const defaultHour = defaultHoursByDay.get(day);
      if (defaultHour) {
        finalWorkingHourIds.push(defaultHour.id);
      } else {
        finalWorkingHourIds.push(zeroHourIds[day]);
      }
    }

    // 6. 새로 추가되는 트레이너 처리
    for (const trainerId of trainersToAdd) {
      await tx.trainer.update({
        where: { id: trainerId },
        data: {
          fitnessCenterId: centerId,
          workingHours: {
            set: finalWorkingHourIds.map((id) => ({ id })),
          },
        },
      });
    }

    // 7. 제거되는 트레이너 처리 (센터 배정 해제, workingHours 모두 0으로)
    for (const trainerId of trainersToRemove) {
      await tx.trainer.update({
        where: { id: trainerId },
        data: {
          fitnessCenterId: null,
          workingHours: {
            set: Object.values(zeroHourIds).map((id) => ({ id })),
          },
        },
      });
    }

    // 8. 검증: 처리된 모든 트레이너가 정확히 7개의 workingHours를 가지는지 확인
    const processedTrainerIds = [...trainersToAdd, ...trainersToRemove];
    for (const trainerId of processedTrainerIds) {
      const trainer = await tx.trainer.findUnique({
        where: { id: trainerId },
        select: {
          workingHours: {
            select: { dayOfWeek: true },
          },
        },
      });

      if (trainer?.workingHours.length !== 7) {
        throw new Error(
          `트레이너의 근무시간 설정에 오류가 있습니다. (${trainer?.workingHours.length}/7일)`
        );
      }

      const assignedDays = new Set(
        trainer.workingHours.map((h) => h.dayOfWeek)
      );
      const missingDays = weekDays.filter((day) => !assignedDays.has(day));

      if (missingDays.length > 0) {
        throw new Error(
          `트레이너의 근무시간에 누락된 요일이 있습니다: ${missingDays.join(", ")}`
        );
      }
    }

    return {
      success: true,
      added: trainersToAdd.length,
      removed: trainersToRemove.length,
      total: trainerIds.length,
    };
  });
};

// 매니저의 트레이너 프로필 조회 또는 생성
export const getOrCreateTrainerProfileForManager = async (userId: string) => {
  // 먼저 매니저 프로필 확인
  const manager = await prisma.manager.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!manager) {
    throw new Error("매니저 프로필을 찾을 수 없습니다.");
  }

  // 트레이너 프로필 조회
  let trainer = await prisma.trainer.findUnique({
    where: { userId },
    select: {
      id: true,
      fitnessCenterId: true,
    }
  });

  // 트레이너 프로필이 없으면 생성
  if (!trainer) {
    trainer = await prisma.trainer.create({
      data: {
        userId,
        // 매니저는 센터 배정 없이 트레이너 프로필만 생성
        fitnessCenterId: null,
      },
      select: {
        id: true,
        fitnessCenterId: true,
      }
    });
  }

  return trainer;
};

// 트레이너의 매니저 프로필 조회
export const getManagerProfileForTrainer = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      managerProfile: {
        select: {
          id: true,
        }
      }
    }
  });

  return user?.managerProfile;
};

// 타입 추론
export type TrainersForCenterAssignment = Awaited<
  ReturnType<typeof getTrainersForCenterAssignment>
>;
export type AssignTrainersToCenterResult = Awaited<
  ReturnType<typeof assignTrainersToCenter>
>;
export type TrainerProfileForManager = Awaited<
  ReturnType<typeof getOrCreateTrainerProfileForManager>
>;
export type ManagerProfileForTrainer = Awaited<
  ReturnType<typeof getManagerProfileForTrainer>
>;