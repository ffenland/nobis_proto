import prisma from "@/app/lib/prisma";
import { getKSTToday, parseKSTDate } from "@/app/lib/utils/time.utils";
import { validateMasterAccess } from "./product.service";

// 레슨 상태 타입
export type LessonStatus = "예정" | "진행중" | "참석" | "결석";

// 레슨 상태 계산 함수
function calculateLessonStatus(
  scheduledAt: Date,
  recordCount: number
): LessonStatus {
  const now = new Date();
  const scheduledTime = new Date(scheduledAt);
  const oneHourLater = new Date(scheduledTime.getTime() + 60 * 60 * 1000);

  // 예정: 현재시간 < scheduledAt
  if (now < scheduledTime) {
    return "예정";
  }

  // 진행중: scheduledAt ≤ 현재시간 < scheduledAt + 1시간
  if (now >= scheduledTime && now < oneHourLater) {
    return "진행중";
  }

  // 참석/결석: 현재시간 ≥ scheduledAt + 1시간
  if (recordCount > 0) {
    return "참석";
  } else {
    return "결석";
  }
}

// 오늘의 레슨 정보 조회 (마스터용)
export async function getTodayLessonInfoForMaster(
  masterId: string,
  date?: string // YYYYMMDD 형식 (optional)
) {
  // 1. 마스터 권한 검증
  await validateMasterAccess(masterId);

  // 2. 날짜 범위 설정 (KST 기준)
  let targetDate: Date;
  if (date) {
    // 날짜 파라미터가 있으면 파싱
    targetDate = parseKSTDate(date);
  } else {
    // 없으면 오늘 날짜
    targetDate = getKSTToday();
  }

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // 3. 모든 센터의 해당 날짜 레슨 조회
  const lessons = await prisma.lesson.findMany({
    where: {
      scheduledAt: {
        gte: targetDate,
        lt: nextDay,
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      endAt: true,
      isCanceled: true,
      pt: {
        select: {
          trainer: {
            select: {
              id: true,
              user: {
                select: {
                  username: true,
                  realname: true,
                },
              },
            },
          },
          member: {
            select: {
              user: {
                select: {
                  username: true,
                  realname: true,
                },
              },
            },
          },
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      records: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  // 4. 센터별 → 트레이너별로 데이터 재구성
  const centerData: {
    [centerId: string]: {
      centerTitle: string;
      trainers: {
        [trainerId: string]: {
          trainerName: string;
          lessons: Array<{
            id: string;
            scheduledAt: string;
            endAt: string;
            memberName: string;
            status: LessonStatus;
          }>;
        };
      };
      canceledLessons: Array<{
        id: string;
        scheduledAt: string;
        endAt: string;
        trainerName: string;
        memberName: string;
      }>;
    };
  } = {};

  lessons.forEach((lesson) => {
    const centerId = lesson.fitnessCenter.id;
    const centerTitle = lesson.fitnessCenter.title;

    // null 체크
    if (!lesson.pt.trainer || !lesson.pt.member) {
      return;
    }

    const trainerId = lesson.pt.trainer.id;
    const trainerName =
      lesson.pt.trainer.user.realname || lesson.pt.trainer.user.username;
    const memberName =
      lesson.pt.member.user.realname || lesson.pt.member.user.username;

    // 센터 데이터 초기화
    if (!centerData[centerId]) {
      centerData[centerId] = {
        centerTitle,
        trainers: {},
        canceledLessons: [],
      };
    }

    // 취소된 레슨 처리
    if (lesson.isCanceled) {
      centerData[centerId].canceledLessons.push({
        id: lesson.id,
        scheduledAt: lesson.scheduledAt.toISOString(),
        endAt: lesson.endAt.toISOString(),
        trainerName,
        memberName,
      });
      return; // 취소된 레슨은 트레이너별 목록에 추가하지 않음
    }

    // 트레이너 데이터 초기화
    if (!centerData[centerId].trainers[trainerId]) {
      centerData[centerId].trainers[trainerId] = {
        trainerName,
        lessons: [],
      };
    }

    // 레슨 상태 계산
    const status = calculateLessonStatus(
      lesson.scheduledAt,
      lesson.records.length
    );

    // 레슨 추가
    centerData[centerId].trainers[trainerId].lessons.push({
      id: lesson.id,
      scheduledAt: lesson.scheduledAt.toISOString(),
      endAt: lesson.endAt.toISOString(),
      memberName,
      status,
    });
  });

  return centerData;
}

// 타입 추론
export type GetTodayLessonInfoForMasterResult = Awaited<
  ReturnType<typeof getTodayLessonInfoForMaster>
>;
