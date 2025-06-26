// app/lib/services/pt-schedule-change.service.ts
import prisma from "@/app/lib/prisma";
import { ScheduleChangeState } from "@prisma/client";

// 타입 정의
export interface IScheduleChangeRequest {
  ptRecordId: string;
  requestorId: string;
  requestedDate: Date;
  requestedStartTime: number;
  requestedEndTime: number;
  reason: string;
}

export interface IScheduleChangeResponse {
  requestId: string;
  responderId: string;
  approved: boolean;
  responseMessage?: string;
}

export interface IExistingRequest {
  id: string;
  requestedDate: Date;
  requestedStartTime: number;
  requestedEndTime: number;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  requestorName: string;
}

// 기존 PENDING 요청 체크
export const checkExistingPendingRequest = async (
  ptRecordId: string
): Promise<{
  hasExisting: boolean;
  existingRequest: IExistingRequest | null;
}> => {
  const existingRequest = await prisma.ptScheduleChangeRequest.findFirst({
    where: {
      ptRecordId,
      state: ScheduleChangeState.PENDING,
    },
    include: {
      requestor: {
        select: {
          username: true,
        },
      },
    },
  });

  return {
    hasExisting: !!existingRequest,
    existingRequest: existingRequest
      ? {
          id: existingRequest.id,
          requestedDate: existingRequest.requestedDate,
          requestedStartTime: existingRequest.requestedStartTime,
          requestedEndTime: existingRequest.requestedEndTime,
          reason: existingRequest.reason,
          createdAt: existingRequest.createdAt,
          expiresAt: existingRequest.expiresAt,
          requestorName: existingRequest.requestor.username,
        }
      : null,
  };
};

// 일정 충돌 체크
const checkScheduleConflict = async (params: {
  trainerId: string;
  memberId: string;
  newDate: Date;
  newStartTime: number;
  newEndTime: number;
  excludePtRecordId?: string;
}): Promise<void> => {
  const {
    trainerId,
    memberId,
    newDate,
    newStartTime,
    newEndTime,
    excludePtRecordId,
  } = params;

  // 트레이너의 다른 PT 충돌 체크
  const trainerConflict = await prisma.ptRecord.findFirst({
    where: {
      AND: [
        { id: { not: excludePtRecordId } },
        {
          pt: {
            trainerId,
            state: "CONFIRMED",
          },
        },
        {
          ptSchedule: {
            date: newDate,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          },
        },
      ],
    },
  });

  if (trainerConflict) {
    throw new Error("해당 시간에 트레이너의 다른 수업이 있습니다.");
  }

  // 회원의 다른 PT 충돌 체크
  const memberConflict = await prisma.ptRecord.findFirst({
    where: {
      AND: [
        { id: { not: excludePtRecordId } },
        {
          pt: {
            memberId,
            state: "CONFIRMED",
          },
        },
        {
          ptSchedule: {
            date: newDate,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          },
        },
      ],
    },
  });

  if (memberConflict) {
    throw new Error("해당 시간에 회원의 다른 수업이 있습니다.");
  }
};

// Member 요청 생성
export const createMemberScheduleChangeRequest = async (
  params: IScheduleChangeRequest
): Promise<string> => {
  const {
    ptRecordId,
    requestorId,
    requestedDate,
    requestedStartTime,
    requestedEndTime,
    reason,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. 기존 PENDING 요청 체크
    const existingCheck = await checkExistingPendingRequest(ptRecordId);
    if (existingCheck.hasExisting) {
      throw new Error("EXISTING_REQUEST_FOUND");
    }

    // 2. PtRecord 조회 및 권한 체크
    const ptRecord = await tx.ptRecord.findUnique({
      where: { id: ptRecordId },
      include: {
        ptSchedule: true,
        pt: {
          include: {
            member: { include: { user: true } },
            trainer: { include: { user: true } },
          },
        },
      },
    });

    if (!ptRecord) {
      throw new Error("수업 정보를 찾을 수 없습니다.");
    }

    // 권한 체크 - 요청자가 해당 PT의 회원인지
    if (ptRecord.pt.member?.user.id !== requestorId) {
      throw new Error("해당 수업의 회원만 변경 요청할 수 있습니다.");
    }

    // 3. 24시간 규칙 체크
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

    // 4. 충돌 체크
    await checkScheduleConflict({
      trainerId: ptRecord.pt.trainerId!,
      memberId: ptRecord.pt.memberId!,
      newDate: requestedDate,
      newStartTime: requestedStartTime,
      newEndTime: requestedEndTime,
      excludePtRecordId: ptRecordId,
    });

    // 5. 요청 생성
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const request = await tx.ptScheduleChangeRequest.create({
      data: {
        ptRecordId,
        requestorId,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        reason,
        expiresAt,
      },
    });

    return request.id;
  });
};

// Trainer 요청 생성
export const createTrainerScheduleChangeRequest = async (
  params: IScheduleChangeRequest
): Promise<string> => {
  const {
    ptRecordId,
    requestorId,
    requestedDate,
    requestedStartTime,
    requestedEndTime,
    reason,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. 기존 PENDING 요청 체크
    const existingCheck = await checkExistingPendingRequest(ptRecordId);
    if (existingCheck.hasExisting) {
      throw new Error("EXISTING_REQUEST_FOUND");
    }

    // 2. PtRecord 조회 및 권한 체크
    const ptRecord = await tx.ptRecord.findUnique({
      where: { id: ptRecordId },
      include: {
        ptSchedule: true,
        pt: {
          include: {
            member: { include: { user: true } },
            trainer: { include: { user: true } },
          },
        },
      },
    });

    if (!ptRecord) {
      throw new Error("수업 정보를 찾을 수 없습니다.");
    }

    // 권한 체크 - 요청자가 해당 PT의 트레이너인지
    if (ptRecord.pt.trainer?.user.id !== requestorId) {
      throw new Error("해당 수업의 트레이너만 변경 요청할 수 있습니다.");
    }

    // 3. 미래 수업인지 체크 (트레이너는 24시간 제약 없음)
    const now = new Date();
    const classDate = new Date(ptRecord.ptSchedule.date);

    if (classDate <= now) {
      throw new Error("이미 지난 수업은 변경할 수 없습니다.");
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

    // 5. 요청 생성
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const request = await tx.ptScheduleChangeRequest.create({
      data: {
        ptRecordId,
        requestorId,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        reason,
        expiresAt,
      },
    });

    return request.id;
  });
};

// 기존 요청 취소 후 새 요청 생성
export const cancelExistingAndCreateNewRequest = async (
  params: IScheduleChangeRequest
): Promise<string> => {
  const {
    ptRecordId,
    requestorId,
    requestedDate,
    requestedStartTime,
    requestedEndTime,
    reason,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. 기존 PENDING 요청들을 CANCELLED로 변경
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

    // 2. PtRecord 조회 및 권한 체크
    const ptRecord = await tx.ptRecord.findUnique({
      where: { id: ptRecordId },
      include: {
        ptSchedule: true,
        pt: {
          include: {
            member: { include: { user: true } },
            trainer: { include: { user: true } },
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

    // 5. 새 요청 생성
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const request = await tx.ptScheduleChangeRequest.create({
      data: {
        ptRecordId,
        requestorId,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        reason,
        expiresAt,
      },
    });

    return request.id;
  });
};

// 요청 승인
export const approveScheduleChangeRequest = async (
  params: IScheduleChangeResponse
): Promise<void> => {
  const { requestId, responderId, responseMessage } = params;

  await prisma.$transaction(async (tx) => {
    // 1. 요청 조회 및 유효성 체크
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        ptRecord: {
          include: {
            pt: {
              include: {
                member: { include: { user: true } },
                trainer: { include: { user: true } },
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

    // 응답 권한 체크 (요청자가 아닌 상대방인지)
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
      update: {}, // 이미 존재하면 그대로 사용
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

// 요청 거절
export const rejectScheduleChangeRequest = async (
  params: IScheduleChangeResponse
): Promise<void> => {
  const { requestId, responderId, responseMessage } = params;

  await prisma.$transaction(async (tx) => {
    // 1. 요청 조회 및 유효성 체크
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        ptRecord: {
          include: {
            pt: {
              include: {
                member: { include: { user: true } },
                trainer: { include: { user: true } },
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

// 요청 취소 (요청자만 가능)
export const cancelScheduleChangeRequest = async (
  requestId: string,
  userId: string
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const request = await tx.ptScheduleChangeRequest.findUnique({
      where: { id: requestId },
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

// 사용자의 요청/응답 목록 조회
export const getUserScheduleChangeRequests = async (userId: string) => {
  const requests = await prisma.ptScheduleChangeRequest.findMany({
    where: {
      OR: [{ requestorId: userId }, { responderId: userId }],
    },
    include: {
      requestor: {
        select: { username: true },
      },
      responder: {
        select: { username: true },
      },
      ptRecord: {
        include: {
          ptSchedule: true,
          pt: {
            include: {
              member: {
                include: { user: { select: { username: true } } },
              },
              trainer: {
                include: { user: { select: { username: true } } },
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
