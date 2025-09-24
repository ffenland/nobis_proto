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
      startAt: {
        gte: startDate,
        lte: endDate,
      },
      state: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      state: true,
    },
    orderBy: {
      startAt: "asc",
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

// TrainerOff 생성을 위한 타입 정의
export type CreateTrainerOffInput = {
  trainerId: string;
  date: string; // YYYY-MM-DD 형식
  offType: "FULL_DAY" | "MORNING" | "AFTERNOON";
};

export async function createTrainerOff(input: CreateTrainerOffInput) {
  const { trainerId, date, offType } = input;

  // 날짜 파싱
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  let startAt: Date;
  let endAt: Date;

  // 휴무 유형에 따른 시간 설정
  switch (offType) {
    case "FULL_DAY":
      // 종일: 00:00 ~ 23:59
      startAt = new Date(year, month, day, 0, 0, 0);
      endAt = new Date(year, month, day, 23, 59, 0);
      break;
    case "MORNING":
      // 오전: 00:00 ~ 12:59
      startAt = new Date(year, month, day, 0, 0, 0);
      endAt = new Date(year, month, day, 12, 59, 0);
      break;
    case "AFTERNOON":
      // 오후: 13:00 ~ 23:59
      startAt = new Date(year, month, day, 13, 0, 0);
      endAt = new Date(year, month, day, 23, 59, 0);
      break;
    default:
      throw new Error("Invalid off type");
  }

  // 기존 레슨과 충돌 검사
  const conflictingLessons = await prisma.lesson.findMany({
    where: {
      pt: {
        trainerId: trainerId,
        state: "CONFIRMED", // 확정된 PT만
      },
      scheduledAt: {
        gte: startAt,
        lt: endAt,
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
    },
  });

  if (conflictingLessons.length > 0) {
    const firstLesson = conflictingLessons[0];
    const memberName = firstLesson.pt.member?.user.username || "미정";
    const lessonTime = firstLesson.scheduledAt.toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const message = `선택하신 시간에 ${memberName} 회원과의 PT 수업(${lessonTime})이 예정되어 있습니다.`;
    // 에러를 던져서 API 에러 처리에서 409 상태로 반환
    throw new Error(message);
  }

  // TrainerOff 생성
  const trainerOff = await prisma.trainerOff.create({
    data: {
      trainerId,
      startAt,
      endAt,
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      state: true,
      createdAt: true,
    },
  });

  return trainerOff;
}

// 타입 추론
export type GetTrainerScheduleResult = Awaited<
  ReturnType<typeof getTrainerSchedule>
>;

export type CreateTrainerOffResult = Awaited<
  ReturnType<typeof createTrainerOff>
>;
