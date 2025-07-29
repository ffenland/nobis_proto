// app/trainer/pt/[id]/[ptRecordId]/scheduleChange/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState, ScheduleChangeState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { setDateForWrite } from "@/app/lib/prisma.util";

export const getCurrentUserAction = async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return {
    id: session.id,
    role: session.role,
    roleId: session.roleId,
  };
};

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
              time: true,
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

  const requests = await prisma.ptScheduleChangeRequest.findMany({
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
      state: true,
      requestedDate: true,
      requestedStartTime: true,
      requestedEndTime: true,
      originalDate: true,
      originalStartTime: true,
      originalEndTime: true,
      reason: true,
      createdAt: true,
      responseMessage: true,
      requestor: {
        select: {
          id: true,
          role: true,
          username: true,
        },
      },
      responder: {
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

  // 기존 PENDING 상태의 일정 변경 요청이 있는지 확인
  const existingPendingRequest = await prisma.ptScheduleChangeRequest.findFirst({
    where: {
      ptRecordId,
      state: ScheduleChangeState.PENDING,
    },
  });

  if (existingPendingRequest) {
    throw new Error("이미 처리 대기 중인 일정 변경 요청이 있습니다. 기존 요청을 취소하거나 처리 완료 후 새 요청을 작성해주세요.");
  }

  // 기존 스케줄 정보 가져오기
  const currentSchedule = await prisma.ptRecord.findFirst({
    where: { id: ptRecordId },
    select: {
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!currentSchedule) {
    throw new Error("현재 스케줄 정보를 찾을 수 없습니다.");
  }

  // 새 일정 변경 요청 생성
  await prisma.ptScheduleChangeRequest.create({
    data: {
      ptRecordId,
      requestedDate: setDateForWrite(requestedDate),
      requestedStartTime,
      requestedEndTime,
      originalDate: currentSchedule.ptSchedule.date,
      originalStartTime: currentSchedule.ptSchedule.startTime,
      originalEndTime: currentSchedule.ptSchedule.endTime,
      reason,
      requestorId: session.id,
      state: ScheduleChangeState.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후 만료
    },
  });

  revalidatePath(`/trainer/pt/${ptRecord.ptId}/${ptRecordId}/scheduleChange`);

  return { success: true };
};

export const respondToScheduleChangeRequestAction = async (
  requestId: string,
  status: "APPROVED" | "REJECTED",
  responseMessage?: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER" && session.role !== "MEMBER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // 요청이 존재하고 관련된 PT인지 확인
  const whereCondition = session.role === "TRAINER" 
    ? {
        id: requestId,
        ptRecord: {
          pt: {
            trainerId: session.roleId,
          },
        },
        state: ScheduleChangeState.PENDING,
      }
    : {
        id: requestId,
        ptRecord: {
          pt: {
            member: {
              userId: session.id,
            },
          },
        },
        state: ScheduleChangeState.PENDING,
      };

  const request = await prisma.ptScheduleChangeRequest.findFirst({
    where: whereCondition,
    include: {
      ptRecord: {
        include: {
          pt: {
            include: {
              member: {
                include: {
                  user: true,
                },
              },
            },
          },
          ptSchedule: true,
        },
      },
      requestor: true,
    },
  });

  if (!request) {
    throw new Error("권한이 없거나 일정 변경 요청을 찾을 수 없습니다.");
  }

  // 요청자가 본인인지 확인 (본인은 승인/거절 불가)
  if (request.requestorId === session.id) {
    throw new Error("본인이 요청한 일정 변경은 승인/거절할 수 없습니다.");
  }

  // 트레이너가 요청한 경우 → 회원만 응답 가능
  // 회원이 요청한 경우 → 트레이너만 응답 가능
  if (request.requestor.role === "TRAINER" && session.role !== "MEMBER") {
    throw new Error("트레이너가 요청한 일정 변경은 회원만 승인/거절할 수 있습니다.");
  }
  
  if (request.requestor.role === "MEMBER" && session.role !== "TRAINER") {
    throw new Error("회원이 요청한 일정 변경은 트레이너만 승인/거절할 수 있습니다.");
  }

  // 회원인 경우 해당 PT의 회원인지 확인
  if (session.role === "MEMBER") {
    if (request.ptRecord.pt.member?.userId !== session.id) {
      throw new Error("해당 PT의 회원만 응답할 수 있습니다.");
    }
  }

  // 트랜잭션으로 처리
  await prisma.$transaction(async (tx) => {
    // 요청 상태 업데이트
    await tx.ptScheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        state:
          status === "APPROVED"
            ? ScheduleChangeState.APPROVED
            : ScheduleChangeState.REJECTED,
        responseMessage: responseMessage,
        responderId: session.id,
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

  revalidatePath(
    `/trainer/pt/${request.ptRecord.ptId}/${request.ptRecordId}/scheduleChange`
  );
  revalidatePath(`/trainer/pt/${request.ptRecord.ptId}`);

  return { success: true };
};

export const cancelScheduleChangeRequestAction = async (requestId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // 요청이 존재하고 본인이 요청한 것인지 확인
  const request = await prisma.ptScheduleChangeRequest.findFirst({
    where: {
      id: requestId,
      requestorId: session.id,
      state: ScheduleChangeState.PENDING,
      ptRecord: {
        pt: {
          trainerId: session.roleId,
        },
      },
    },
    include: {
      ptRecord: {
        include: {
          pt: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("본인이 요청한 일정 변경 요청을 찾을 수 없습니다.");
  }

  // 요청 상태를 CANCELLED로 업데이트
  await prisma.ptScheduleChangeRequest.update({
    where: { id: requestId },
    data: {
      state: ScheduleChangeState.CANCELLED,
      responderId: session.id,
      respondedAt: new Date(),
      responseMessage: "요청자가 취소함",
    },
  });

  revalidatePath(
    `/trainer/pt/${request.ptRecord.ptId}/${request.ptRecordId}/scheduleChange`
  );
  revalidatePath(`/trainer/pt/${request.ptRecord.ptId}`);

  return { success: true };
};

// 타입 추론을 위한 타입 유틸리티
export type TPtScheduleDetail = Awaited<
  ReturnType<typeof getPtScheduleDetailAction>
>;
export type TScheduleChangeRequest = Awaited<
  ReturnType<typeof getScheduleChangeRequestsAction>
>[number];
