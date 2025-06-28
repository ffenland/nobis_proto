// app/lib/services/pt-schedule-change.service.ts

import prisma from "@/app/lib/prisma";
import { ScheduleChangeState } from "@prisma/client";

// ===== 입력 타입만 수동 정의 =====
export interface IScheduleChangeRequest {
  ptRecordId: string;
  requestorId: string;
  requestedDate: string;
  requestedStartTime: number;
  requestedEndTime: number;
  reason: string;
  forceCancelExisting?: boolean;
}

export interface IScheduleChangeResponse {
  requestId: string;
  responderId: string;
  responseMessage?: string;
}

interface IScheduleConflictCheck {
  trainerId: string;
  memberId: string;
  newDate: string;
  newStartTime: number;
  newEndTime: number;
  excludePtRecordId?: string;
}

// ===== 유틸리티 함수들 =====

// 충돌 체크 함수 (select 사용)
const checkScheduleConflict = async (params: IScheduleConflictCheck) => {
  const {
    trainerId,
    memberId,
    newDate,
    newStartTime,
    newEndTime,
    excludePtRecordId,
  } = params;

  const targetDate = new Date(newDate);

  // 트레이너 충돌 체크 (필요한 필드만 select)
  const trainerConflict = await prisma.ptRecord.findFirst({
    where: {
      id: excludePtRecordId ? { not: excludePtRecordId } : undefined,
      pt: { trainerId },
      ptSchedule: {
        date: targetDate,
        OR: [
          {
            AND: [
              { startTime: { lte: newStartTime } },
              { endTime: { gt: newStartTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: newEndTime } },
              { endTime: { gte: newEndTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: newStartTime } },
              { endTime: { lte: newEndTime } },
            ],
          },
        ],
      },
    },
    select: {
      id: true,
      pt: {
        select: {
          member: {
            select: {
              user: {
                select: { username: true },
              },
            },
          },
        },
      },
    },
  });

  if (trainerConflict) {
    throw new Error(
      `해당 시간에 이미 ${trainerConflict.pt.member?.user.username}님과의 수업이 예정되어 있습니다.`
    );
  }

  // 회원 충돌 체크 (필요한 필드만 select)
  const memberConflict = await prisma.ptRecord.findFirst({
    where: {
      id: excludePtRecordId ? { not: excludePtRecordId } : undefined,
      pt: { memberId },
      ptSchedule: {
        date: targetDate,
        OR: [
          {
            AND: [
              { startTime: { lte: newStartTime } },
              { endTime: { gt: newStartTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: newEndTime } },
              { endTime: { gte: newEndTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: newStartTime } },
              { endTime: { lte: newEndTime } },
            ],
          },
        ],
      },
    },
    select: {
      id: true,
      pt: {
        select: {
          trainer: {
            select: {
              user: {
                select: { username: true },
              },
            },
          },
        },
      },
    },
  });

  if (memberConflict) {
    throw new Error(
      `해당 시간에 이미 ${memberConflict.pt.trainer?.user.username} 트레이너와의 수업이 예정되어 있습니다.`
    );
  }
};

// ===== 메인 함수들 =====

// 기존 PENDING 요청 체크 (select 사용, Original 정보 포함)
export const checkExistingPendingRequest = async (ptRecordId: string) => {
  const existingRequest = await prisma.ptScheduleChangeRequest.findFirst({
    where: {
      ptRecordId,
      state: ScheduleChangeState.PENDING,
    },
    select: {
      id: true,
      reason: true,
      requestedDate: true,
      requestedStartTime: true,
      requestedEndTime: true,
      originalDate: true,
      originalStartTime: true,
      originalEndTime: true,
      createdAt: true,
      expiresAt: true,
      requestor: {
        select: { username: true },
      },
    },
  });

  if (existingRequest) {
    return {
      hasExisting: true,
      existingRequest: {
        id: existingRequest.id,
        reason: existingRequest.reason,
        requestorName: existingRequest.requestor.username,
        requestedDate: existingRequest.requestedDate,
        requestedStartTime: existingRequest.requestedStartTime,
        requestedEndTime: existingRequest.requestedEndTime,
        originalDate: existingRequest.originalDate,
        originalStartTime: existingRequest.originalStartTime,
        originalEndTime: existingRequest.originalEndTime,
        createdAt: existingRequest.createdAt,
        expiresAt: existingRequest.expiresAt,
      },
    };
  }

  return { hasExisting: false };
};

// 일정 변경 요청 생성 (select 사용, Original 정보 저장)
export const createScheduleChangeRequest = async (
  params: IScheduleChangeRequest
) => {
  const {
    ptRecordId,
    requestorId,
    requestedDate,
    requestedStartTime,
    requestedEndTime,
    reason,
    forceCancelExisting = false,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. 기존 PENDING 요청이 있다면 처리
    if (forceCancelExisting) {
      await tx.ptScheduleChangeRequest.updateMany({
        where: {
          ptRecordId,
          state: ScheduleChangeState.PENDING,
        },
        data: {
          state: ScheduleChangeState.CANCELLED,
          responseMessage: "새로운 요청으로 인한 자동 취소",
        },
      });
    }

    // 2. PtRecord 조회 및 권한 체크 (필요한 필드만 select)
    const ptRecord = await tx.ptRecord.findUnique({
      where: { id: ptRecordId },
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
            trainerId: true,
            memberId: true,
            member: {
              select: {
                user: {
                  select: { id: true },
                },
              },
            },
            trainer: {
              select: {
                user: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ptRecord) {
      throw new Error("수업 정보를 찾을 수 없습니다.");
    }

    // 권한 체크 (Member 또는 Trainer)
    const isMember = ptRecord.pt.member?.user.id === requestorId;
    const isTrainer = ptRecord.pt.trainer?.user.id === requestorId;

    if (!isMember && !isTrainer) {
      throw new Error(
        "해당 수업의 회원 또는 트레이너만 변경 요청할 수 있습니다."
      );
    }

    // 3. Member인 경우 24시간 규칙 체크
    if (isMember) {
      const now = new Date();
      const classDateTime = new Date(ptRecord.ptSchedule.date);
      const startHour = Math.floor(ptRecord.ptSchedule.startTime / 100);
      const startMinute = ptRecord.ptSchedule.startTime % 100;
      classDateTime.setHours(startHour, startMinute, 0, 0);

      const hoursUntilClass =
        (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilClass < 24) {
        throw new Error("수업 24시간 전까지만 변경 요청이 가능합니다.");
      }
    } else {
      // Trainer인 경우 미래 수업인지만 체크
      const now = new Date();
      const classDate = new Date(ptRecord.ptSchedule.date);

      if (classDate <= now) {
        throw new Error("이미 지난 수업은 변경할 수 없습니다.");
      }
    }

    // 4. 충돌 체크
    await checkScheduleConflict({
      trainerId: ptRecord.pt.trainerId!,
      memberId: ptRecord.pt.memberId!,
      newDate: requestedDate,
      newStartTime: requestedStartTime,
      newEndTime: requestedEndTime,
      excludePtRecordId: ptRecordId,
    });

    // 5. 새 요청 생성 (Original 정보 포함)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const request = await tx.ptScheduleChangeRequest.create({
      data: {
        ptRecordId,
        requestorId,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        originalDate: ptRecord.ptSchedule.date,
        originalStartTime: ptRecord.ptSchedule.startTime,
        originalEndTime: ptRecord.ptSchedule.endTime,
        reason,
        expiresAt,
      },
      select: {
        id: true,
      },
    });

    return request.id;
  });
};

// 요청 승인 (select 사용)
export const approveScheduleChangeRequest = async (
  params: IScheduleChangeResponse
) => {
  const { requestId, responderId, responseMessage } = params;

  await prisma.$transaction(async (tx) => {
    // 1. 요청 조회 및 유효성 체크 (필요한 필드만 select)
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        state: true,
        requestorId: true,
        ptRecordId: true,
        requestedDate: true,
        requestedStartTime: true,
        requestedEndTime: true,
        expiresAt: true,
        ptRecord: {
          select: {
            pt: {
              select: {
                member: {
                  select: {
                    user: {
                      select: { id: true },
                    },
                  },
                },
                trainer: {
                  select: {
                    user: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new Error("요청을 찾을 수 없습니다.");
    }

    if (request.state !== ScheduleChangeState.PENDING) {
      throw new Error("이미 처리된 요청입니다.");
    }

    // 만료 체크
    if (new Date() > request.expiresAt) {
      throw new Error("만료된 요청입니다.");
    }

    // 응답 권한 체크
    const memberUserId = request.ptRecord.pt.member?.user.id;
    const trainerUserId = request.ptRecord.pt.trainer?.user.id;

    if (request.requestorId === responderId) {
      throw new Error("본인이 요청한 건은 본인이 승인할 수 없습니다.");
    }

    if (responderId !== memberUserId && responderId !== trainerUserId) {
      throw new Error("해당 수업의 회원 또는 트레이너만 응답할 수 있습니다.");
    }

    // 2. 새로운 PtSchedule 찾기 또는 생성
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

    // 3. PtRecord의 ptScheduleId 업데이트
    await tx.ptRecord.update({
      where: { id: request.ptRecordId },
      data: {
        ptScheduleId: newPtSchedule.id,
      },
    });

    // 4. 요청 상태를 APPROVED로 변경
    await tx.ptScheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        state: ScheduleChangeState.APPROVED,
        responderId,
        responseMessage,
        respondedAt: new Date(),
      },
    });
  });
};

// 요청 거절 (select 사용)
export const rejectScheduleChangeRequest = async (
  params: IScheduleChangeResponse
) => {
  const { requestId, responderId, responseMessage } = params;

  await prisma.$transaction(async (tx) => {
    // 1. 요청 조회 및 유효성 체크 (필요한 필드만 select)
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        state: true,
        requestorId: true,
        expiresAt: true,
        ptRecord: {
          select: {
            pt: {
              select: {
                member: {
                  select: {
                    user: {
                      select: { id: true },
                    },
                  },
                },
                trainer: {
                  select: {
                    user: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new Error("요청을 찾을 수 없습니다.");
    }

    if (request.state !== ScheduleChangeState.PENDING) {
      throw new Error("이미 처리된 요청입니다.");
    }

    // 만료 체크
    if (new Date() > request.expiresAt) {
      throw new Error("만료된 요청입니다.");
    }

    // 응답 권한 체크
    const memberUserId = request.ptRecord.pt.member?.user.id;
    const trainerUserId = request.ptRecord.pt.trainer?.user.id;

    if (request.requestorId === responderId) {
      throw new Error("본인이 요청한 건은 본인이 거절할 수 없습니다.");
    }

    if (responderId !== memberUserId && responderId !== trainerUserId) {
      throw new Error("해당 수업의 회원 또는 트레이너만 응답할 수 있습니다.");
    }

    // 2. 요청 상태를 REJECTED로 변경
    await tx.ptScheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        state: ScheduleChangeState.REJECTED,
        responderId,
        responseMessage,
        respondedAt: new Date(),
      },
    });
  });
};

// 요청 취소 (select 사용)
export const cancelScheduleChangeRequest = async (
  requestId: string,
  userId: string
) => {
  await prisma.$transaction(async (tx) => {
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestorId: true,
        state: true,
      },
    });

    if (!request) {
      throw new Error("요청을 찾을 수 없습니다.");
    }

    if (request.requestorId !== userId) {
      throw new Error("요청자만 취소할 수 있습니다.");
    }

    if (request.state !== ScheduleChangeState.PENDING) {
      throw new Error("대기 중인 요청만 취소할 수 있습니다.");
    }

    await tx.ptScheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        state: ScheduleChangeState.CANCELLED,
        responseMessage: "요청자에 의한 취소",
      },
    });
  });
};

// 사용자의 요청/응답 목록 조회 (select 사용, Original 정보 포함)
export const getUserScheduleChangeRequests = async (userId: string) => {
  const requests = await prisma.ptScheduleChangeRequest.findMany({
    where: {
      OR: [{ requestorId: userId }, { responderId: userId }],
    },
    select: {
      id: true,
      state: true,
      reason: true,
      responseMessage: true,
      createdAt: true,
      respondedAt: true,
      expiresAt: true,
      requestorId: true,
      originalDate: true,
      originalStartTime: true,
      originalEndTime: true,
      requestedDate: true,
      requestedStartTime: true,
      requestedEndTime: true,
      requestor: {
        select: { username: true },
      },
      responder: {
        select: { username: true },
      },
      ptRecord: {
        select: {
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
                    select: { username: true },
                  },
                },
              },
              trainer: {
                select: {
                  user: {
                    select: { username: true },
                  },
                },
              },
              ptProduct: {
                select: { title: true },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests.map((request) => ({
    id: request.id,
    state: request.state,
    reason: request.reason,
    responseMessage: request.responseMessage,
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
    expiresAt: request.expiresAt,
    requestorName: request.requestor.username,
    responderName: request.responder?.username,
    isMyRequest: request.requestorId === userId,
    ptInfo: {
      id: request.ptRecord.pt.id,
      title: request.ptRecord.pt.ptProduct.title,
      memberName: request.ptRecord.pt.member?.user.username,
      trainerName: request.ptRecord.pt.trainer?.user.username,
    },
    originalSchedule: {
      date: request.originalDate,
      startTime: request.originalStartTime,
      endTime: request.originalEndTime,
    },
    currentSchedule: {
      date: request.ptRecord.ptSchedule.date,
      startTime: request.ptRecord.ptSchedule.startTime,
      endTime: request.ptRecord.ptSchedule.endTime,
    },
    requestedSchedule: {
      date: request.requestedDate,
      startTime: request.requestedStartTime,
      endTime: request.requestedEndTime,
    },
  }));
};

// 요청 상세 조회 (select 사용)
export const getScheduleChangeRequestDetail = async (
  requestId: string,
  userId: string
) => {
  const scheduleChangeRequest = await prisma.ptScheduleChangeRequest.findUnique(
    {
      where: { id: requestId },
      select: {
        id: true,
        state: true,
        reason: true,
        responseMessage: true,
        createdAt: true,
        respondedAt: true,
        expiresAt: true,
        requestorId: true,
        originalDate: true,
        originalStartTime: true,
        originalEndTime: true,
        requestedDate: true,
        requestedStartTime: true,
        requestedEndTime: true,
        requestor: {
          select: { username: true },
        },
        responder: {
          select: { username: true },
        },
        ptRecord: {
          select: {
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
                        id: true,
                        username: true,
                      },
                    },
                  },
                },
                trainer: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                      },
                    },
                  },
                },
                ptProduct: {
                  select: { title: true },
                },
              },
            },
          },
        },
      },
    }
  );

  if (!scheduleChangeRequest) {
    return null;
  }

  // 권한 체크
  const memberUserId = scheduleChangeRequest.ptRecord.pt.member?.user.id;
  const trainerUserId = scheduleChangeRequest.ptRecord.pt.trainer?.user.id;

  if (userId !== memberUserId && userId !== trainerUserId) {
    throw new Error("해당 요청을 조회할 권한이 없습니다.");
  }

  // 응답 데이터 구성 (타입 자동 추론)
  return {
    id: scheduleChangeRequest.id,
    state: scheduleChangeRequest.state,
    reason: scheduleChangeRequest.reason,
    responseMessage: scheduleChangeRequest.responseMessage,
    createdAt: scheduleChangeRequest.createdAt,
    respondedAt: scheduleChangeRequest.respondedAt,
    expiresAt: scheduleChangeRequest.expiresAt,
    requestorName: scheduleChangeRequest.requestor.username,
    responderName: scheduleChangeRequest.responder?.username,
    isMyRequest: scheduleChangeRequest.requestorId === userId,
    canRespond:
      scheduleChangeRequest.requestorId !== userId &&
      scheduleChangeRequest.state === "PENDING" &&
      new Date() < scheduleChangeRequest.expiresAt,
    ptInfo: {
      id: scheduleChangeRequest.ptRecord.pt.id,
      title: scheduleChangeRequest.ptRecord.pt.ptProduct.title,
      memberName: scheduleChangeRequest.ptRecord.pt.member?.user.username,
      trainerName: scheduleChangeRequest.ptRecord.pt.trainer?.user.username,
    },
    originalSchedule: {
      date: scheduleChangeRequest.originalDate,
      startTime: scheduleChangeRequest.originalStartTime,
      endTime: scheduleChangeRequest.originalEndTime,
    },
    currentSchedule: {
      date: scheduleChangeRequest.ptRecord.ptSchedule.date,
      startTime: scheduleChangeRequest.ptRecord.ptSchedule.startTime,
      endTime: scheduleChangeRequest.ptRecord.ptSchedule.endTime,
    },
    requestedSchedule: {
      date: scheduleChangeRequest.requestedDate,
      startTime: scheduleChangeRequest.requestedStartTime,
      endTime: scheduleChangeRequest.requestedEndTime,
    },
  };
};

// ===== 타입 추론 활용 =====
// 함수 반환 타입 자동 추출 (타입 추론 활용)
export type ICheckExistingResult = Awaited<
  ReturnType<typeof checkExistingPendingRequest>
>;
export type IScheduleChangeRequestList = Awaited<
  ReturnType<typeof getUserScheduleChangeRequests>
>;
export type IScheduleChangeRequestItem = IScheduleChangeRequestList[number];
export type IScheduleChangeRequestDetail = Awaited<
  ReturnType<typeof getScheduleChangeRequestDetail>
>;
