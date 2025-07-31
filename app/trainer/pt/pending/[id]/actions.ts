// app/trainer/pt/pending/[id]/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getPendingPtDetailAction = async (ptId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId: session.roleId,
      state: PtState.PENDING,
    },
    select: {
      id: true,
      createdAt: true,
      startDate: true,
      description: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
          time: true,
          description: true,
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
    throw new Error("PT 정보를 찾을 수 없습니다.");
  }

  if (!pt.member) {
    throw new Error("회원이 배정되지 않았습니다.");
  }

  return pt;
};

export const approvePtAction = async (ptId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // PT가 존재하고 트레이너가 소유하는지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId: session.roleId,
      state: PtState.PENDING,
    },
  });

  if (!pt) {
    throw new Error("권한이 없거나 PT를 찾을 수 없습니다.");
  }

  // PT 상태를 CONFIRMED로 변경
  await prisma.pt.update({
    where: { id: ptId },
    data: {
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
    },
  });

  // 캐시 무효화
  revalidatePath("/trainer/pt/pending");
  revalidatePath(`/trainer/pt/pending/${ptId}`);

  // 승인된 PT 상세 페이지로 리다이렉트
  redirect(`/trainer/pt/${ptId}`);
};

export const rejectPtAction = async (ptId: string, formData: FormData) => {
  const reason = formData.get("reason") as string;
  
  if (!reason?.trim()) {
    throw new Error("거절 사유를 입력해주세요.");
  }
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // PT와 관련된 정보 조회
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId: session.roleId,
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
    throw new Error("권한이 없거나 PT를 찾을 수 없습니다.");
  }

  // 스케줄 정보를 문자열로 생성
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
      
      const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
      
      return `${year}년 ${month}월 ${day}일 ${startTime}~${endTime}`;
    })
    .join(", ");

  // 트랜잭션으로 처리
  await prisma.$transaction(async (tx) => {
    // 1. PtRejectInfo 생성
    await tx.ptRejectInfo.create({
      data: {
        ptId,
        reason,
        schedule: scheduleInfo,
      },
    });

    // 2. 모든 PtRecord 삭제 (스케줄 시간대 해제)
    await tx.ptRecord.deleteMany({
      where: { ptId },
    });

    // 3. PT 상태를 REJECTED로 변경
    await tx.pt.update({
      where: { id: ptId },
      data: {
        state: PtState.REJECTED,
      },
    });
  });

  // 캐시 무효화
  revalidatePath("/trainer/pt/pending");
  revalidatePath(`/trainer/pt/pending/${ptId}`);

  // 거절된 PT 목록으로 리다이렉트
  redirect("/trainer/pt/rejected");
};

// 타입 추론을 위한 타입 유틸리티
export type TPendingPtDetail = Awaited<ReturnType<typeof getPendingPtDetailAction>>;