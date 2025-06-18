"use server";

import prisma from "@/app/lib/prisma";
import { WeekDay } from "@prisma/client";
import { getSessionOrRedirect } from "@/app/lib/session";
import { weekdaysEnum } from "@/app/lib/constants";

interface UpdateTrainerProfileData {
  introduce: string;
  avatar?: string;
}

export interface AddTrainerOffData {
  weekDay: WeekDay | "";
  date: string;
  startTime: number;
  endTime: number;
}

export async function getTrainerProfile(trainerId: string) {
  const trainer = await prisma.trainer.findUnique({
    where: {
      userId: trainerId,
    },
    select: {
      id: true,
      introduce: true,
      avatar: true,
      user: {
        select: {
          username: true,
        },
      },
      trainerOff: {
        select: {
          id: true,
          weekDay: true,
          date: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ date: "asc" }, { weekDay: "asc" }],
      },
    },
  });
  return trainer;
}

export async function updateTrainerProfile(
  userId: string,
  data: UpdateTrainerProfileData
) {
  const trainer = await prisma.trainer.update({
    where: {
      userId,
    },
    data: {
      introduce: data.introduce,
      avatar: data.avatar,
    },
  });
  return trainer;
}

async function checkOverlappingPtScheduleForDate(
  userId: string,
  date: Date,
  startTime: number,
  endTime: number
) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const overlapped = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainer: {
          userId: userId,
        },
      },
      ptSchedule: {
        AND: [
          { date: { equals: checkDate } },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
            ],
          },
        ],
      },
    },
    select: {
      ptSchedule: {
        select: {
          startTime: true,
          endTime: true,
          date: true,
        },
      },
      pt: {
        select: {
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
  console.log(overlapped);
  return overlapped;
}

async function checkOverlappingPtSchedule(
  userId: string,
  date: Date | null,
  weekDay: WeekDay | null,
  startTime: number,
  endTime: number
) {
  if (date) {
    // 특정 날짜의 일정 확인
    return await checkOverlappingPtScheduleForDate(
      userId,
      date,
      startTime,
      endTime
    );
  } else {
    // 정기 일정의 경우 4개월치 날짜를 계산
    const today = new Date();
    const fourMonthsLater = new Date();
    fourMonthsLater.setMonth(today.getMonth() + 5);
    fourMonthsLater.setDate(0); // 다음 달의 0일은 이전 달의 마지막 날이 됨

    // 해당 요일을 가진 모든 날짜 계산
    const dates: Date[] = [];
    const currentDate = new Date(today);
    while (currentDate <= fourMonthsLater) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek === weekdaysEnum.find((w) => w.enum === weekDay)?.key) {
        const date = new Date(currentDate);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 각 날짜에 대해 겹치는 일정 확인
    console.log(dates, "DATES");
    const allOverlappingRecords = await Promise.all(
      dates.map((checkDate) =>
        checkOverlappingPtScheduleForDate(userId, checkDate, startTime, endTime)
      )
    );

    // 중복 제거 및 평탄화
    const uniqueRecords = Array.from(
      new Map(
        allOverlappingRecords
          .flat()
          .map((record) => [record.ptSchedule.date?.toISOString(), record])
      ).values()
    );

    return uniqueRecords;
  }
}

export async function addTrainerOff(userId: string, data: AddTrainerOffData) {
  if ((data.date && data.weekDay) || (!data.date && !data.weekDay)) {
    return {
      ok: false,
      error: {
        code: "003",
        message: "요일과 날짜 중 하나만 선택해야 합니다.",
      },
    };
  }

  // PT 일정과 겹치는지 확인
  const overlappingRecords = await checkOverlappingPtSchedule(
    userId,
    data.date ? new Date(data.date) : null,
    data.weekDay as WeekDay,
    data.startTime,
    data.endTime
  );

  if (overlappingRecords.length > 0) {
    const conflictDetails = overlappingRecords.map((record) => {
      const schedule = record.ptSchedule;
      return {
        memberName: record.pt.member?.user.username || "알 수 없는 회원",
        date: schedule.date
          ? new Date(schedule.date).toLocaleDateString()
          : "정기 일정",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      };
    });

    return {
      ok: false,
      error: {
        code: "004",
        message: "PT 일정과 겹칩니다",
        conflicts: conflictDetails,
      },
    };
  }

  const trainerOff = await prisma.trainerOff.create({
    data: {
      trainer: { connect: { userId } },
      weekDay: data.weekDay as WeekDay | null,
      date: data.date ? new Date(data.date) : null,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });
  return { ok: true, data: trainerOff };
}

export async function removeTrainerOff(offId: string) {
  const trainerOff = await prisma.trainerOff.delete({
    where: {
      id: offId,
    },
  });
  return trainerOff;
}

export async function updateTrainerOff(offId: string, data: AddTrainerOffData) {
  const session = await getSessionOrRedirect();

  const trainerOff = await prisma.trainerOff.findUnique({
    where: { id: offId },
    select: { trainerId: true },
  });

  if (!trainerOff) {
    return {
      ok: false,
      error: {
        code: "001",
        message: "휴무정보를 찾을 수 없습니다.",
      },
    };
  }

  if (trainerOff.trainerId !== session.roleId) {
    return {
      ok: false,
      error: {
        code: "002",
        message: "해당 휴무를 수정할 권한이 없습니다.",
      },
    };
  }

  if ((data.date && data.weekDay) || (!data.date && !data.weekDay)) {
    return {
      ok: false,
      error: {
        code: "003",
        message: "요일과 날짜 중 하나만 선택해야 합니다.",
      },
    };
  }

  // PT 일정과 겹치는지 확인
  const overlappingRecords = await checkOverlappingPtSchedule(
    session.id,
    data.date ? new Date(data.date) : null,
    data.weekDay as WeekDay,
    data.startTime,
    data.endTime
  );

  if (overlappingRecords.length > 0) {
    const conflictDetails = overlappingRecords.map((record) => {
      const schedule = record.ptSchedule;
      return {
        memberName: record.pt.member?.user.username || "알 수 없는 회원",
        date: schedule.date
          ? new Date(schedule.date).toLocaleDateString()
          : "정기 일정",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      };
    });

    return {
      ok: false,
      error: {
        code: "004",
        message: "PT 일정과 겹칩니다",
        conflicts: conflictDetails,
      },
    };
  }

  const updatedTrainerOff = await prisma.trainerOff.update({
    where: {
      id: offId,
    },
    data: {
      weekDay: data.weekDay as WeekDay | null,
      date: data.date ? new Date(data.date) : null,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });
  return { ok: true, data: updatedTrainerOff };
}

export async function getTrainerOffs(trainerId: string) {
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
    },
    orderBy: [{ date: "asc" }, { weekDay: "asc" }],
  });
  return trainerOffs;
}
