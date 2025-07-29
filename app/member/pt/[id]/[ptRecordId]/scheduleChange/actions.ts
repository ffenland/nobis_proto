"use server";

import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { PtState, ScheduleChangeState } from "@prisma/client";
import { setDateForWrite } from "@/app/lib/prisma.util";
import { revalidatePath } from "next/cache";

// 현재 사용자 정보 조회
export const getCurrentUserAction = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return {
    id: session.id,
    role: session.role,
  };
};

// PT 스케줄 상세 조회
export const getPtScheduleDetailAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session || session.role !== "MEMBER") {
    redirect("/login");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        memberId: session.roleId,
        state: {
          in: [PtState.CONFIRMED, PtState.PENDING],
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
    throw new Error("PT 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// 일정 변경 요청 목록 조회
export const getScheduleChangeRequestsAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session || session.role !== "MEMBER") {
    redirect("/login");
  }

  const requests = await prisma.ptScheduleChangeRequest.findMany({
    where: {
      ptRecordId,
      // 본인이 관련된 요청만
      ptRecord: {
        pt: {
          memberId: session.roleId,
        },
      },
    },
    select: {
      id: true,
      state: true,
      reason: true,
      responseMessage: true,
      createdAt: true,
      respondedAt: true,
      expiresAt: true,
      requestedDate: true,
      requestedStartTime: true,
      requestedEndTime: true,
      originalDate: true,
      originalStartTime: true,
      originalEndTime: true,
      requestor: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
      responder: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
};

// 일정 변경 요청 생성
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

  if (session.role !== "MEMBER") {
    throw new Error("접근 권한이 없습니다.");
  }

  try {
    // PT 기록이 존재하고 회원이 소유하는지 확인
    const ptRecord = await prisma.ptRecord.findFirst({
      where: {
        id: ptRecordId,
        pt: {
          memberId: session.roleId,
          state: {
            in: [PtState.CONFIRMED, PtState.FINISHED],
          },
        },
      },
      select: {
        id: true,
        ptId: true,
        ptSchedule: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        pt: {
          select: {
            trainerId: true,
            memberId: true,
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

    // 24시간 규칙 체크
    const now = new Date();
    const classDateTime = new Date(ptRecord.ptSchedule.date);
    const startHour = Math.floor(ptRecord.ptSchedule.startTime / 100);
    const startMinute = ptRecord.ptSchedule.startTime % 100;
    classDateTime.setHours(startHour, startMinute, 0, 0);

    const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilClass < 24) {
      throw new Error("수업 24시간 전까지만 변경 요청이 가능합니다.");
    }

    // 새 일정 변경 요청 생성
    await prisma.ptScheduleChangeRequest.create({
      data: {
        ptRecordId,
        requestedDate: setDateForWrite(requestedDate),
        requestedStartTime,
        requestedEndTime,
        originalDate: ptRecord.ptSchedule.date,
        originalStartTime: ptRecord.ptSchedule.startTime,
        originalEndTime: ptRecord.ptSchedule.endTime,
        reason,
        requestorId: session.id,
        state: ScheduleChangeState.PENDING,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48시간 후 만료
      },
    });

    revalidatePath(`/member/pt/${ptRecord.ptId}/${ptRecordId}/scheduleChange`);

    return { success: true };
  } catch (error) {
    console.error("일정 변경 요청 생성 실패:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "일정 변경 요청 생성에 실패했습니다.",
    };
  }
};

// 일정 변경 요청 승인
export const approveScheduleChangeRequestAction = async (
  requestId: string,
  responseMessage?: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MEMBER") {
    throw new Error("접근 권한이 없습니다.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 요청 조회 및 유효성 체크
      const request = await tx.ptScheduleChangeRequest.findFirst({
        where: {
          id: requestId,
          state: ScheduleChangeState.PENDING,
          ptRecord: {
            pt: {
              memberId: session.roleId,
            },
          },
        },
        select: {
          id: true,
          requestorId: true,
          ptRecordId: true,
          requestedDate: true,
          requestedStartTime: true,
          requestedEndTime: true,
          expiresAt: true,
          ptRecord: {
            select: {
              ptScheduleId: true,
              ptId: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error("권한이 없거나 일정 변경 요청을 찾을 수 없습니다.");
      }

      // 요청자가 본인인지 확인 (본인은 승인 불가)
      if (request.requestorId === session.id) {
        throw new Error("본인이 요청한 일정 변경은 승인할 수 없습니다.");
      }

      // 만료 체크
      if (new Date() > request.expiresAt) {
        throw new Error("만료된 요청입니다.");
      }

      // 새로운 PtSchedule 찾기 또는 생성
      const newPtSchedule = await tx.ptSchedule.upsert({
        where: {
          date_startTime_endTime: {
            date: request.requestedDate,
            startTime: request.requestedStartTime,
            endTime: request.requestedEndTime,
          },
        },
        create: {
          date: request.requestedDate,
          startTime: request.requestedStartTime,
          endTime: request.requestedEndTime,
        },
        update: {},
        select: {
          id: true,
        },
      });

      // PtRecord의 ptScheduleId 업데이트
      await tx.ptRecord.update({
        where: { id: request.ptRecordId },
        data: {
          ptScheduleId: newPtSchedule.id,
        },
      });

      // 요청 상태를 APPROVED로 변경
      await tx.ptScheduleChangeRequest.update({
        where: { id: requestId },
        data: {
          state: ScheduleChangeState.APPROVED,
          responderId: session.id,
          responseMessage,
          respondedAt: new Date(),
        },
      });

      revalidatePath(`/member/pt/${request.ptRecord.ptId}/${request.ptRecordId}/scheduleChange`);
      revalidatePath(`/member/pt/${request.ptRecord.ptId}`);
    });

    return { success: true };
  } catch (error) {
    console.error("일정 변경 요청 승인 실패:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "일정 변경 요청 승인에 실패했습니다.",
    };
  }
};

// 일정 변경 요청 거절
export const rejectScheduleChangeRequestAction = async (
  requestId: string,
  responseMessage?: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MEMBER") {
    throw new Error("접근 권한이 없습니다.");
  }

  try {
    const result = await prisma.ptScheduleChangeRequest.updateMany({
      where: {
        id: requestId,
        state: ScheduleChangeState.PENDING,
        ptRecord: {
          pt: {
            memberId: session.roleId,
          },
        },
        requestorId: {
          not: session.id,
        },
      },
      data: {
        state: ScheduleChangeState.REJECTED,
        responderId: session.id,
        responseMessage,
        respondedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("권한이 없거나 일정 변경 요청을 찾을 수 없습니다.");
    }

    // 경로 재검증을 위해 ptRecord 정보 조회
    const request = await prisma.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        ptRecord: {
          select: {
            ptId: true,
            id: true,
          },
        },
      },
    });

    if (request) {
      revalidatePath(`/member/pt/${request.ptRecord.ptId}/${request.ptRecord.id}/scheduleChange`);
      revalidatePath(`/member/pt/${request.ptRecord.ptId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("일정 변경 요청 거절 실패:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "일정 변경 요청 거절에 실패했습니다.",
    };
  }
};

// 일정 변경 요청 취소
export const cancelScheduleChangeRequestAction = async (requestId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MEMBER") {
    throw new Error("접근 권한이 없습니다.");
  }

  try {
    const result = await prisma.ptScheduleChangeRequest.updateMany({
      where: {
        id: requestId,
        requestorId: session.id,
        state: ScheduleChangeState.PENDING,
        ptRecord: {
          pt: {
            memberId: session.roleId,
          },
        },
      },
      data: {
        state: ScheduleChangeState.CANCELLED,
        responderId: session.id,
        respondedAt: new Date(),
        responseMessage: "요청자가 취소함",
      },
    });

    if (result.count === 0) {
      throw new Error("본인이 요청한 일정 변경 요청을 찾을 수 없습니다.");
    }

    // 경로 재검증을 위해 ptRecord 정보 조회
    const request = await prisma.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        ptRecord: {
          select: {
            ptId: true,
            id: true,
          },
        },
      },
    });

    if (request) {
      revalidatePath(`/member/pt/${request.ptRecord.ptId}/${request.ptRecord.id}/scheduleChange`);
      revalidatePath(`/member/pt/${request.ptRecord.ptId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("일정 변경 요청 취소 실패:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "일정 변경 요청 취소에 실패했습니다.",
    };
  }
};

// 타입 추론
export type TPtScheduleDetail = Awaited<
  ReturnType<typeof getPtScheduleDetailAction>
>;
export type TScheduleChangeRequest = Awaited<
  ReturnType<typeof getScheduleChangeRequestsAction>
>[number];