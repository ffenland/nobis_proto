// app/trainer/pt/[id]/[ptRecordId]/scheduleChange/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState, ScheduleChangeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getPtScheduleDetailAction = async (ptRecordId: string) => {
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
          id: true,
          date: true,
          startTime: true,
          endTime: true,
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
    throw new Error("스케줄 정보를 찾을 수 없습니다.");
  }

  return ptRecord;
};

export const getScheduleChangeRequestsAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const requests = await prisma.scheduleChangeRequest.findMany({
    where: {
      ptRecordId: ptRecordId,
      ptRecord: {
        pt: {
          trainerId: session.roleId,
        },
      },
    },
    select: {
      id: true,
      status: true,
      requestedDate: true,
      requestedStartTime: true,
      requestedEndTime: true,
      reason: true,
      responseReason: true,
      createdAt: true,
      requestedBy: {
        select: {
          role: true,
          username: true,
        },
      },
      respondedBy: {
        select: {
          role: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
};

export const createScheduleChangeRequestAction = async (
  ptRecordId: string,
  requestedDate: string,
  requestedStartTime: number,
  requestedEndTime: number,
  reason: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // PT 기록이 존재하고 트레이너가 소유하는지 확인
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
  });

  if (!ptRecord) {
    throw new Error("권한이 없거나 PT 기록을 찾을 수 없습니다.");
  }

  // 새 일정 변경 요청 생성
  await prisma.scheduleChangeRequest.create({
    data: {
      ptRecordId,
      requestedDate: new Date(requestedDate),
      requestedStartTime,
      requestedEndTime,
      reason,
      requestedById: session.id,
      status: ScheduleChangeStatus.PENDING,
    },
  });

  revalidatePath(`/trainer/pt/${ptRecord.ptId}/${ptRecordId}/scheduleChange`);
  
  return { success: true };
};

export const respondToScheduleChangeRequestAction = async (
  requestId: string,
  status: "APPROVED" | "REJECTED",
  responseReason?: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // 요청이 존재하고 트레이너가 소유하는지 확인
  const request = await prisma.scheduleChangeRequest.findFirst({
    where: {
      id: requestId,
      ptRecord: {
        pt: {
          trainerId: session.roleId,
        },
      },
      status: ScheduleChangeStatus.PENDING,
    },
    include: {
      ptRecord: {
        include: {
          pt: true,
          ptSchedule: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("권한이 없거나 일정 변경 요청을 찾을 수 없습니다.");
  }

  // 트랜잭션으로 처리
  await prisma.$transaction(async (tx) => {
    // 요청 상태 업데이트
    await tx.scheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        status: status === "APPROVED" ? ScheduleChangeStatus.APPROVED : ScheduleChangeStatus.REJECTED,
        responseReason,
        respondedById: session.id,
        respondedAt: new Date(),
      },
    });

    // 승인된 경우 실제 스케줄 업데이트
    if (status === "APPROVED") {
      await tx.ptSchedule.update({
        where: { id: request.ptRecord.ptSchedule.id },
        data: {
          date: request.requestedDate,
          startTime: request.requestedStartTime,
          endTime: request.requestedEndTime,
        },
      });
    }
  });

  revalidatePath(`/trainer/pt/${request.ptRecord.ptId}/${request.ptRecordId}/scheduleChange`);
  revalidatePath(`/trainer/pt/${request.ptRecord.ptId}`);
  
  return { success: true };
};

// 타입 추론을 위한 타입 유틸리티
export type TPtScheduleDetail = Awaited<ReturnType<typeof getPtScheduleDetailAction>>;
export type TScheduleChangeRequest = Awaited<ReturnType<typeof getScheduleChangeRequestsAction>>[number];