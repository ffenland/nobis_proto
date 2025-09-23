// app/services/trainer/schedule.service.ts
import prisma from "@/app/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getTrainerSchedule(
  trainerId: string,
  targetMonth?: string
) {
  // targetMonth 파싱 (YYYYMM 형식)
  let startDate: Date;
  let endDate: Date;

  if (targetMonth && /^\d{6}$/.test(targetMonth)) {
    const year = parseInt(targetMonth.substring(0, 4));
    const month = parseInt(targetMonth.substring(4, 6)) - 1; // JavaScript month는 0-indexed
    startDate = startOfMonth(new Date(year, month));
    endDate = endOfMonth(new Date(year, month));
  } else {
    // 현재 월 사용
    const now = new Date();
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
  }

  // Lesson 데이터 조회
  const lessons = await prisma.lesson.findMany({
    where: {
      pt: {
        trainerId: trainerId,
        state: "CONFIRMED", // 확정된 PT만
      },
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      isCanceled: false, // 취소되지 않은 레슨만
    },
    select: {
      id: true,
      scheduledAt: true,
      endAt: true,
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
      fitnessCenter: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  // TrainerOff 데이터 조회
  const offDays = await prisma.trainerOff.findMany({
    where: {
      trainerId: trainerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  // 데이터 변환 및 반환
  const formattedLessons = lessons.map((lesson) => ({
    id: lesson.id,
    scheduledAt: lesson.scheduledAt,
    endAt: lesson.endAt,
    member: {
      username: lesson.pt.member?.user.username || "미정",
    },
    fitnessCenter: {
      title: lesson.fitnessCenter.title,
    },
  }));

  return {
    lessons: formattedLessons,
    offDays,
  };
}

// 타입 추론
export type GetTrainerScheduleResult = Awaited<
  ReturnType<typeof getTrainerSchedule>
>;