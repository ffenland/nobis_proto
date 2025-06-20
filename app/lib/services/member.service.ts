// app/lib/services/member.service.ts
import prisma from "@/app/lib/prisma";
import { AttendanceState } from "@prisma/client";

// 회원 기본 정보 조회
export const getMemberInfoService = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      user: { select: { username: true } },
    },
  });

  if (!member) {
    throw new Error("회원 정보를 찾을 수 없습니다.");
  }

  return {
    username: member.user.username,
  };
};

// PT 요약 정보 조회
export const getPtSummaryService = async (memberId: string) => {
  const ptList = await prisma.pt.findMany({
    where: {
      memberId,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
        },
      },
      isRegular: true,
      trainerConfirmed: true,
      isActive: true,
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      ptRecord: {
        where: {
          ptSchedule: {
            date: {
              gte: new Date(),
            },
          },
        },
        select: {
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
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ptList.map((pt) => ({
    id: pt.id,
    ptProduct: pt.ptProduct,
    trainer: pt.trainer,
    trainerConfirmed: pt.trainerConfirmed,
    isActive: pt.isActive,
    upcomingSession:
      pt.ptRecord.length > 0
        ? {
            date: pt.ptRecord[0].ptSchedule.date.toISOString(), // 문자열로 변환
            startTime: pt.ptRecord[0].ptSchedule.startTime,
            endTime: pt.ptRecord[0].ptSchedule.endTime,
          }
        : undefined,
  }));
};

// 최근 운동 기록 조회
export const getRecentRecordsService = async (memberId: string) => {
  const recentRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        memberId,
      },
      attended: AttendanceState.ATTENDED,
      ptSchedule: {
        date: {
          lt: new Date(),
        },
      },
    },
    select: {
      id: true,
      ptSchedule: {
        select: {
          date: true,
        },
      },
      pt: {
        select: {
          trainer: {
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
      items: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      ptSchedule: {
        date: "desc",
      },
    },
    take: 10,
  });

  return recentRecords.map((record) => ({
    id: record.id,
    date: record.ptSchedule.date.toISOString(), // 문자열로 변환
    exerciseCount: record.items.length,
    trainerName: record.pt.trainer?.user.username || "알 수 없음",
  }));
};

// 회원 PT 목록 조회 (기존 getPtList 대체)
export const getMemberPtListService = async (memberId: string) => {
  const ptList = await prisma.pt.findMany({
    where: {
      memberId,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          time: true,
          price: true,
        },
      },
      isRegular: true,
      weekTimes: {
        select: {
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
      trainerConfirmed: true,
      isActive: true,
      startDate: true,
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ptList;
};

// 타입 추론을 통한 타입 정의
export type IMemberInfo = Awaited<ReturnType<typeof getMemberInfoService>>;
export type IPtSummary = Awaited<
  ReturnType<typeof getPtSummaryService>
>[number];
export type IRecentRecord = Awaited<
  ReturnType<typeof getRecentRecordsService>
>[number];
export type IMemberPtList = Awaited<ReturnType<typeof getMemberPtListService>>;
