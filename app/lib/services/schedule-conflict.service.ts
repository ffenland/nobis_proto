// app/lib/services/schedule-conflict.service.ts
import prisma from "@/app/lib/prisma";
import { PtState, WeekDay } from "@prisma/client";

// 입력 타입 정의 (I 접두사 사용)
export interface IDaySchedule {
  [dateKey: string]: number[]; // "2024-12-01": [900, 930, 1000] 형태
}

export interface IScheduleConflictCheckRequest {
  ptId: string;
}

// 서비스 함수들 (반환 타입 명시하지 않음)
export async function checkRegularPtExtensionConflict(
  trainerId: string,
  newApplicationSchedule: IDaySchedule
) {
  try {
    // 1. 해당 트레이너의 정기 PT 중 곧 종료되는 것들 찾기 (select 사용)
    const endingSoonPts = await prisma.pt.findMany({
      where: {
        trainerId,
        state: PtState.CONFIRMED,
        isRegular: true,
        // null 체크를 위한 조건 추가
        memberId: { not: null },
        member: { isNot: null },
      },
      select: {
        id: true,
        memberId: true,
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
            totalCount: true,
          },
        },
        ptRecord: {
          where: {
            attended: "ATTENDED",
          },
          select: {
            id: true,
            ptSchedule: {
              select: {
                date: true,
              },
            },
          },
        },
        weekTimes: {
          select: {
            weekDay: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // 2. 거의 완료된 PT들 필터링 (80% 이상 완료)
    const nearCompletionPts = endingSoonPts.filter((pt) => {
      const completedCount = pt.ptRecord.length;
      const totalCount = pt.ptProduct.totalCount;
      return completedCount / totalCount >= 0.8; // 80% 이상 완료
    });

    // 3. 새 신청과 요일/시간 겹침 체크
    const conflictingMembers: {
      memberId: string;
      memberName: string;
      ptId: string;
      ptTitle: string;
      lastSessionDate: string;
      completionRate: number;
      conflictingDays: string[];
      conflictingTimes: string[];
      remainingSessions: number;
    }[] = [];

    for (const pt of nearCompletionPts) {
      // null 체크 추가
      if (!pt.member || !pt.memberId) {
        continue; // member가 null인 경우 건너뛰기
      }

      const conflictingDays: string[] = [];
      const conflictingTimes: string[] = [];

      // 새 신청의 요일별 시간 분석
      for (const [dateStr, times] of Object.entries(newApplicationSchedule)) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const weekDayEnum = getWeekDayEnum(dayOfWeek);

        // 해당 요일에 기존 PT가 있는지 체크
        const existingWeekTime = pt.weekTimes.find(
          (wt) => wt.weekDay === weekDayEnum
        );

        if (existingWeekTime) {
          // 시간 겹침 체크
          const hasTimeOverlap = times.some((newTime) => {
            return timeRangesOverlap(
              newTime,
              newTime + 100, // 1시간 가정
              existingWeekTime.startTime,
              existingWeekTime.endTime
            );
          });

          if (hasTimeOverlap) {
            const koreanDay = getKoreanDayName(weekDayEnum);
            if (!conflictingDays.includes(koreanDay)) {
              conflictingDays.push(koreanDay);
            }

            const timeStr = `${formatTime(
              existingWeekTime.startTime
            )}-${formatTime(existingWeekTime.endTime)}`;
            if (!conflictingTimes.includes(timeStr)) {
              conflictingTimes.push(timeStr);
            }
          }
        }
      }

      if (conflictingDays.length > 0) {
        // 마지막 수업일 계산
        const lastSessionDate = await getLastScheduledSession(pt.id);

        // 완료율 계산
        const completedCount = pt.ptRecord.length;
        const totalCount = pt.ptProduct.totalCount;
        const completionRate = completedCount / totalCount;
        const remainingSessions = totalCount - completedCount;

        conflictingMembers.push({
          memberId: pt.memberId, // 이제 null이 아님을 보장
          memberName: pt.member.user.username,
          ptId: pt.id,
          ptTitle: pt.ptProduct.title,
          lastSessionDate: lastSessionDate.toISOString(),
          completionRate,
          conflictingDays,
          conflictingTimes,
          remainingSessions,
        });
      }
    }

    return {
      hasConflict: conflictingMembers.length > 0,
      conflictingMembers,
    };
  } catch (error) {
    console.error("스케줄 충돌 체크 오류:", error);
    return {
      hasConflict: false,
      conflictingMembers: [],
    };
  }
}

// PT 신청의 스케줄 정보로부터 충돌 체크
export async function checkPtApplicationConflict(ptId: string) {
  try {
    // PT 신청 정보 조회 (select 사용)
    const ptApplication = await prisma.pt.findUnique({
      where: { id: ptId },
      select: {
        trainerId: true,
        ptRecord: {
          select: {
            ptSchedule: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    });

    if (!ptApplication || !ptApplication.trainerId) {
      return { hasConflict: false, conflictingMembers: [] };
    }

    // 스케줄을 IDaySchedule 형태로 변환
    const chosenSchedule: IDaySchedule = {};

    ptApplication.ptRecord.forEach((record) => {
      const dateKey = record.ptSchedule.date.toISOString().split("T")[0];
      const startTime = record.ptSchedule.startTime;

      if (!chosenSchedule[dateKey]) {
        chosenSchedule[dateKey] = [];
      }

      if (!chosenSchedule[dateKey].includes(startTime)) {
        chosenSchedule[dateKey].push(startTime);
      }
    });

    // 충돌 체크 실행 (trainerId가 null이 아님을 보장)
    return await checkRegularPtExtensionConflict(
      ptApplication.trainerId,
      chosenSchedule
    );
  } catch (error) {
    console.error("PT 신청 충돌 체크 오류:", error);
    return {
      hasConflict: false,
      conflictingMembers: [],
    };
  }
}

// ===== 유틸리티 함수들 =====

// 요일 번호를 WeekDay enum으로 변환
function getWeekDayEnum(dayOfWeek: number): WeekDay {
  const mapping: WeekDay[] = [
    WeekDay.SUN,
    WeekDay.MON,
    WeekDay.TUE,
    WeekDay.WED,
    WeekDay.THU,
    WeekDay.FRI,
    WeekDay.SAT,
  ];
  return mapping[dayOfWeek];
}

// WeekDay enum을 한글 요일명으로 변환
function getKoreanDayName(weekDay: WeekDay): string {
  const mapping: Record<WeekDay, string> = {
    [WeekDay.SUN]: "일",
    [WeekDay.MON]: "월",
    [WeekDay.TUE]: "화",
    [WeekDay.WED]: "수",
    [WeekDay.THU]: "목",
    [WeekDay.FRI]: "금",
    [WeekDay.SAT]: "토",
  };
  return mapping[weekDay];
}

// 시간 범위 겹침 체크
function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

// 시간 포맷팅 (900 -> "09:00")
function formatTime(time: number): string {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

// 마지막 예정된 수업일 조회
async function getLastScheduledSession(ptId: string): Promise<Date> {
  const lastSession = await prisma.ptRecord.findFirst({
    where: { ptId },
    select: {
      ptSchedule: {
        select: { date: true },
      },
    },
    orderBy: {
      ptSchedule: {
        date: "desc",
      },
    },
  });

  return lastSession?.ptSchedule.date || new Date();
}

// 타입 추론을 위한 임시 서비스 인스턴스
const scheduleConflictService = {
  checkRegularPtExtensionConflict,
  checkPtApplicationConflict,
};

// 타입 추출
export type IScheduleConflictResult = Awaited<
  ReturnType<typeof scheduleConflictService.checkRegularPtExtensionConflict>
>;
export type IConflictingMember =
  IScheduleConflictResult["conflictingMembers"][number];
