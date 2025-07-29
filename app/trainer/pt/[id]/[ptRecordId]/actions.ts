// app/trainer/pt/[id]/[ptRecordId]/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState } from "@prisma/client";

export const getPtRecordDetailAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
        state: {
          in: [PtState.CONFIRMED, PtState.FINISHED],
        },
      },
    },
    select: {
      id: true,
      memo: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      scheduleChangeRequest: {
        where: {
          state: "PENDING",
        },
        select: {
          id: true,
          requestedDate: true,
          requestedStartTime: true,
          requestedEndTime: true,
          reason: true,
          createdAt: true,
          requestor: {
            select: {
              id: true,
              role: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      items: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          entry: true,
          machineSetRecords: {
            select: {
              id: true,
              set: true,
              settingValues: {
                select: {
                  id: true,
                  value: true,
                  machineSetting: {
                    select: {
                      title: true,
                      unit: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              set: "asc",
            },
          },
          freeSetRecords: {
            select: {
              id: true,
              reps: true,
              set: true,
              equipments: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  primaryValue: true,
                  primaryUnit: true,
                },
              },
            },
            orderBy: {
              set: "asc",
            },
          },
          stretchingExerciseRecords: {
            select: {
              id: true,
              description: true,
              stretchingExercise: {
                select: {
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: {
          entry: "asc",
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
          ptProduct: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("운동 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// 운동 기록 편집 시간 제한 검증
export const checkEditTimePermissionAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
        state: {
          in: [PtState.CONFIRMED, PtState.FINISHED],
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
    },
  });

  if (!ptRecord) {
    throw new Error("운동 기록을 찾을 수 없습니다.");
  }

  // 현재 시간
  const now = new Date();

  // 수업 시작/종료 시간 계산
  const scheduleDate = new Date(ptRecord.ptSchedule.date);
  const startHour = Math.floor(ptRecord.ptSchedule.startTime / 100);
  const startMinute = ptRecord.ptSchedule.startTime % 100;
  const endHour = Math.floor(ptRecord.ptSchedule.endTime / 100);
  const endMinute = ptRecord.ptSchedule.endTime % 100;

  const scheduleStart = new Date(scheduleDate);
  scheduleStart.setHours(startHour, startMinute, 0, 0);

  const scheduleEnd = new Date(scheduleDate);
  scheduleEnd.setHours(endHour, endMinute, 0, 0);

  // 편집 허용 시간 계산 (시작 5분 전 ~ 종료 1시간 후)
  const allowedStart = new Date(scheduleStart.getTime() - 5 * 60 * 1000); // 5분 전
  const allowedEnd = new Date(scheduleEnd.getTime() + 60 * 60 * 1000); // 1시간 후

  //const canEdit = now >= allowedStart && now <= allowedEnd;
  // for test canEdit is always true
  const canEdit = true;
  return {
    canEdit,
    scheduleStart,
    scheduleEnd,
    allowedStart,
    allowedEnd,
    currentTime: now,
  };
};

// PT 기록 정보 조회 (기본 정보만)
export const getPtRecordInfoAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
        state: {
          in: [PtState.CONFIRMED, PtState.FINISHED],
        },
      },
    },
    select: {
      id: true,
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
          trainer: {
            select: {
              fitnessCenterId: true,
              fitnessCenter: {
                select: {
                  id: true,
                  title: true,
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
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("PT 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// 실시간 기록 가능 시간 검증 (수업 시작 30분 전 ~ 종료 1시간 후)
export const checkRecordTimePermissionAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
        state: {
          in: [PtState.CONFIRMED, PtState.FINISHED],
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
    },
  });

  if (!ptRecord) {
    throw new Error("운동 기록을 찾을 수 없습니다.");
  }

  // 현재 시간
  const now = new Date();

  // 수업 시작/종료 시간 계산
  const scheduleDate = new Date(ptRecord.ptSchedule.date);
  const startHour = Math.floor(ptRecord.ptSchedule.startTime / 100);
  const startMinute = ptRecord.ptSchedule.startTime % 100;
  const endHour = Math.floor(ptRecord.ptSchedule.endTime / 100);
  const endMinute = ptRecord.ptSchedule.endTime % 100;

  const scheduleStart = new Date(scheduleDate);
  scheduleStart.setHours(startHour, startMinute, 0, 0);

  const scheduleEnd = new Date(scheduleDate);
  scheduleEnd.setHours(endHour, endMinute, 0, 0);

  // 실시간 기록 허용 시간 계산 (시작 30분 전 ~ 종료 1시간 후)
  const allowedStart = new Date(scheduleStart.getTime() - 30 * 60 * 1000); // 30분 전
  const allowedEnd = new Date(scheduleEnd.getTime() + 60 * 60 * 1000); // 1시간 후

  // const canRecord = now >= allowedStart && now <= allowedEnd;
  // for test canRecord is always true
  const canRecord = true;
  
  return {
    canRecord,
    scheduleStart,
    scheduleEnd,
    allowedStart,
    allowedEnd,
    currentTime: now,
  };
};

// 타입 추론을 위한 타입 유틸리티
export type TPtRecordDetail = Awaited<
  ReturnType<typeof getPtRecordDetailAction>
>;
export type TEditTimePermission = Awaited<
  ReturnType<typeof checkEditTimePermissionAction>
>;
export type TPtRecordInfo = Awaited<
  ReturnType<typeof getPtRecordInfoAction>
>;
export type TRecordTimePermission = Awaited<
  ReturnType<typeof checkRecordTimePermissionAction>
>;
