import prisma from "@/app/lib/prisma";
import type { WeekDay } from "@prisma/client";

// 기본 근무시간 데이터 타입
export interface IWorkingHourData {
  id: string;
  dayOfWeek: WeekDay;
  openTime: number;
  closeTime: number;
}

// 근무시간 생성 데이터 타입
export interface ICreateWorkingHourData {
  dayOfWeek: WeekDay;
  openTime: number;
  closeTime: number;
}

// 센터의 기본 근무시간 조회
export const getCenterWorkingHours = async (centerId: string) => {
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
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

  return center;
};

// 센터 정보와 기본 근무시간, 소속 트레이너 조회
export const getCenterWithDetails = async (centerId: string) => {
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
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
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  return center;
};

// 센터의 기본 근무시간 업데이트
export const updateCenterWorkingHours = async (
  centerId: string,
  workingHours: ICreateWorkingHourData[]
) => {
  return await prisma.$transaction(async (tx) => {
    // 기존 기본 근무시간을 조회하여 저장 (트레이너들과의 연결 추적용)
    const existingCenter = await tx.fitnessCenter.findUnique({
      where: { id: centerId },
      select: {
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

    if (!existingCenter) {
      throw new Error("센터를 찾을 수 없습니다.");
    }

    const oldDefaultWorkingHours = existingCenter.defaultWorkingHours;

    // 기존 기본 근무시간 연결 해제
    await tx.fitnessCenter.update({
      where: { id: centerId },
      data: {
        defaultWorkingHours: {
          set: [],
        },
      },
    });

    // 새로운 근무시간들 생성 또는 찾기
    const workingHourPromises = workingHours.map(async (wh) => {
      // 동일한 근무시간이 이미 존재하는지 확인
      let existingWorkingHour = await tx.workingHour.findUnique({
        where: {
          dayOfWeek_openTime_closeTime: {
            dayOfWeek: wh.dayOfWeek,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
          },
        },
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
        },
      });

      // 없으면 새로 생성
      if (!existingWorkingHour) {
        existingWorkingHour = await tx.workingHour.create({
          data: {
            dayOfWeek: wh.dayOfWeek,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
          },
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        });
      }

      return existingWorkingHour;
    });

    const newWorkingHours = await Promise.all(workingHourPromises);

    // 센터에 새로운 기본 근무시간 연결
    await tx.fitnessCenter.update({
      where: { id: centerId },
      data: {
        defaultWorkingHours: {
          connect: newWorkingHours.map((wh) => ({ id: wh.id })),
        },
      },
    });

    // 해당 센터의 모든 트레이너들과 그들의 근무시간 조회
    const trainersWithWorkingHours = await tx.trainer.findMany({
      where: { fitnessCenterId: centerId },
      select: {
        id: true,
        workingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });

    // 모든 요일에 대한 0시간 근무시간 미리 생성/조회
    const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const zeroTimeWorkingHours: Record<string, { id: string }> = {};
    
    for (const dayOfWeek of allDays) {
      let zeroTimeWorkingHour = await tx.workingHour.findUnique({
        where: {
          dayOfWeek_openTime_closeTime: {
            dayOfWeek: dayOfWeek as WeekDay,
            openTime: 0,
            closeTime: 0,
          },
        },
      });

      if (!zeroTimeWorkingHour) {
        zeroTimeWorkingHour = await tx.workingHour.create({
          data: {
            dayOfWeek: dayOfWeek as WeekDay,
            openTime: 0,
            closeTime: 0,
          },
        });
      }

      zeroTimeWorkingHours[dayOfWeek] = { id: zeroTimeWorkingHour.id };
    }

    // 각 트레이너에 대해 요일별로 default 근무시간 동기화 (배치 처리)
    const trainerUpdatePromises = trainersWithWorkingHours.map(async (trainer) => {
      // 현재 트레이너가 가진 근무시간을 요일별로 매핑
      const trainerWorkingHoursByDay = trainer.workingHours.reduce((acc, wh) => {
        acc[wh.dayOfWeek] = wh;
        return acc;
      }, {} as Record<string, { id: string; dayOfWeek: string; openTime: number; closeTime: number }>);

      const workingHoursToDisconnect = [];
      const workingHoursToConnect = [];
      
      for (const dayOfWeek of allDays) {
        const oldDefaultWorkingHour = oldDefaultWorkingHours.find(old => old.dayOfWeek === dayOfWeek);
        const newDefaultWorkingHour = newWorkingHours.find(newWh => newWh.dayOfWeek === dayOfWeek);
        const trainerCurrentWorkingHour = trainerWorkingHoursByDay[dayOfWeek];

        // 트레이너가 해당 요일에 기존 default 근무시간을 사용하고 있었는지 확인
        const wasUsingDefault = oldDefaultWorkingHour && trainerCurrentWorkingHour && 
          trainerCurrentWorkingHour.id === oldDefaultWorkingHour.id;

        if (wasUsingDefault) {
          // 기존 default 근무시간 연결 해제
          workingHoursToDisconnect.push({ id: oldDefaultWorkingHour.id });

          // 새로운 default 근무시간이 있으면 연결, 없으면 0시간 근무시간 연결
          if (newDefaultWorkingHour) {
            workingHoursToConnect.push({ id: newDefaultWorkingHour.id });
          } else {
            // 미리 생성된 0시간 근무시간 사용
            workingHoursToConnect.push(zeroTimeWorkingHours[dayOfWeek]);
          }
        } else if (!trainerCurrentWorkingHour) {
          // 트레이너가 해당 요일에 근무시간이 없는 경우
          if (newDefaultWorkingHour) {
            // 새로운 센터 기본 근무시간을 연결
            workingHoursToConnect.push({ id: newDefaultWorkingHour.id });
          } else {
            // 미리 생성된 0시간 근무시간 사용
            workingHoursToConnect.push(zeroTimeWorkingHours[dayOfWeek]);
          }
        }
      }

      // 트레이너 업데이트를 한 번에 처리
      if (workingHoursToDisconnect.length > 0 || workingHoursToConnect.length > 0) {
        await tx.trainer.update({
          where: { id: trainer.id },
          data: {
            workingHours: {
              ...(workingHoursToDisconnect.length > 0 && { disconnect: workingHoursToDisconnect }),
              ...(workingHoursToConnect.length > 0 && { connect: workingHoursToConnect }),
            },
          },
        });
        return true;
      }
      
      return false;
    });

    // 모든 트레이너 업데이트를 병렬로 실행
    await Promise.all(trainerUpdatePromises);

    return newWorkingHours;
  });
};

// 센터의 트레이너들 근무시간 동기화 (센터 기본 근무시간 기준)
export const syncTrainerWorkingHours = async (centerId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 센터의 기본 근무시간 조회
    const center = await tx.fitnessCenter.findUnique({
      where: { id: centerId },
      select: {
        id: true,
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

    // 해당 센터의 모든 트레이너들과 그들의 근무시간 조회
    const trainersWithWorkingHours = await tx.trainer.findMany({
      where: { fitnessCenterId: centerId },
      select: {
        id: true,
        workingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });

    // 모든 요일에 대한 0시간 근무시간 미리 생성/조회
    const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const zeroTimeWorkingHours: Record<string, { id: string }> = {};
    
    for (const dayOfWeek of allDays) {
      let zeroTimeWorkingHour = await tx.workingHour.findUnique({
        where: {
          dayOfWeek_openTime_closeTime: {
            dayOfWeek: dayOfWeek as WeekDay,
            openTime: 0,
            closeTime: 0,
          },
        },
      });

      if (!zeroTimeWorkingHour) {
        zeroTimeWorkingHour = await tx.workingHour.create({
          data: {
            dayOfWeek: dayOfWeek as WeekDay,
            openTime: 0,
            closeTime: 0,
          },
        });
      }

      zeroTimeWorkingHours[dayOfWeek] = { id: zeroTimeWorkingHour.id };
    }

    // 각 트레이너에 대해 모든 요일의 근무시간 보장 (병렬 처리)
    const trainerUpdatePromises = trainersWithWorkingHours.map(async (trainer) => {
      const trainerWorkingHoursByDay = trainer.workingHours.reduce((acc, wh) => {
        acc[wh.dayOfWeek] = wh;
        return acc;
      }, {} as Record<string, { id: string; dayOfWeek: string; openTime: number; closeTime: number }>);

      const workingHoursToConnect = [];

      for (const dayOfWeek of allDays) {
        if (!trainerWorkingHoursByDay[dayOfWeek]) {
          // 해당 요일에 근무시간이 없는 경우
          const centerWorkingHour = center.defaultWorkingHours.find(wh => wh.dayOfWeek === dayOfWeek);
          
          if (centerWorkingHour) {
            // 센터에 해당 요일 기본 근무시간이 있으면 사용
            workingHoursToConnect.push({ id: centerWorkingHour.id });
          } else {
            // 센터에 해당 요일 기본 근무시간이 없으면 0시간 근무시간 사용
            workingHoursToConnect.push(zeroTimeWorkingHours[dayOfWeek]);
          }
        }
      }

      // 부족한 근무시간 연결
      if (workingHoursToConnect.length > 0) {
        await tx.trainer.update({
          where: { id: trainer.id },
          data: {
            workingHours: {
              connect: workingHoursToConnect,
            },
          },
        });
        return true; // 업데이트 완료
      }
      
      return false; // 업데이트 불필요
    });

    // 모든 트레이너 업데이트를 병렬로 실행
    const updateResults = await Promise.all(trainerUpdatePromises);
    const processedTrainers = updateResults.filter(result => result).length;

    return { 
      success: true, 
      processedTrainers,
      totalTrainers: trainersWithWorkingHours.length 
    };
  }, {
    timeout: 30000, // 30초 타임아웃
  });
};

// 트레이너를 다른 센터로 이동
export const moveTrainerToCenter = async (trainerId: string, centerId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 새 센터의 기본 근무시간 조회
    const center = await tx.fitnessCenter.findUnique({
      where: { id: centerId },
      select: {
        id: true,
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

    // 모든 요일에 대해 근무시간 설정
    const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const workingHourIds = [];
    
    for (const dayOfWeek of allDays) {
      const centerWorkingHour = center.defaultWorkingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (centerWorkingHour) {
        // 센터에 해당 요일 기본 근무시간이 있으면 사용
        workingHourIds.push({ id: centerWorkingHour.id });
      } else {
        // 센터에 해당 요일 기본 근무시간이 없으면 0시간 근무시간 생성/조회
        let zeroTimeWorkingHour = await tx.workingHour.findUnique({
          where: {
            dayOfWeek_openTime_closeTime: {
              dayOfWeek: dayOfWeek as WeekDay,
              openTime: 0,
              closeTime: 0,
            },
          },
        });

        if (!zeroTimeWorkingHour) {
          zeroTimeWorkingHour = await tx.workingHour.create({
            data: {
              dayOfWeek: dayOfWeek as WeekDay,
              openTime: 0,
              closeTime: 0,
            },
          });
        }

        workingHourIds.push({ id: zeroTimeWorkingHour.id });
      }
    }

    // 트레이너의 센터 이동 및 근무시간 업데이트
    await tx.trainer.update({
      where: { id: trainerId },
      data: {
        fitnessCenterId: centerId,
        workingHours: {
          set: workingHourIds,
        },
      },
    });

    return { success: true };
  });
};


// 모든 센터 목록 조회 (트레이너 수 포함)
export const getAllCentersWithStats = async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
      _count: {
        select: {
          trainers: true,
        },
      },
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
    orderBy: {
      title: "asc",
    },
  });

  return centers;
};

// 타입 추론
export type ICenterWorkingHours = Awaited<
  ReturnType<typeof getCenterWorkingHours>
>;
export type ICenterWithDetails = Awaited<
  ReturnType<typeof getCenterWithDetails>
>;
export type IUpdatedWorkingHours = Awaited<
  ReturnType<typeof updateCenterWorkingHours>
>;
export type ITrainerMoveResult = Awaited<
  ReturnType<typeof moveTrainerToCenter>
>;
export type ICentersWithStats = Awaited<
  ReturnType<typeof getAllCentersWithStats>
>;