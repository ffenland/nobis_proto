import prisma from "@/app/lib/prisma";
import { formatDateWithoutWeekday } from "@/app/lib/utils/time.utils";
import { PtState } from "@prisma/client";

// 입력 타입 정의
export interface CreateDirectRegistrationInput {
  memberId: string;
  trainerId: string;
  totalCount: number;
  time: number;
  selectedDates: Date[];
  schedules: Array<{
    date: Date;
    startTime: number;
    endTime: number;
  }>;
}

// 회원 검색
export async function searchMembersForDirectRegistration(keyword: string) {
  const members = await prisma.member.findMany({
    where: {
      user: {
        username: {
          contains: keyword,
          mode: 'insensitive'
        }
      }
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
  
  // 각 회원의 활성 PT 개수 조회 후 추가
  const membersWithPtCount = await Promise.all(
    members.map(async (member) => {
      const activePtCount = await prisma.pt.count({
        where: {
          memberId: member.id,
          state: { in: [PtState.PENDING, PtState.CONFIRMED] }
        }
      });
      return { ...member, activePtCount };
    })
  );
  
  return membersWithPtCount;
}

export type SearchMembersResult = Awaited<ReturnType<typeof searchMembersForDirectRegistration>>;

// 회원 자격 확인
export async function checkMemberEligibility(memberId: string) {
  const activePts = await prisma.pt.count({
    where: {
      memberId,
      state: { in: [PtState.PENDING, PtState.CONFIRMED] }
    }
  });
  
  return {
    eligible: activePts === 0,
    activePtCount: activePts
  };
}

export type CheckMemberEligibilityResult = Awaited<ReturnType<typeof checkMemberEligibility>>;

// 트레이너 목록 조회
export async function getTrainersForDirectRegistration() {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true
        }
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
  
  return trainers;
}

export type GetTrainersResult = Awaited<ReturnType<typeof getTrainersForDirectRegistration>>;

// 기존 수업 등록
export async function createDirectRegistration(data: CreateDirectRegistrationInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. 회원 정보 조회
    const member = await tx.member.findUnique({
      where: { id: data.memberId },
      select: {
        id: true,
        user: {
          select: { username: true }
        }
      }
    });
    
    if (!member) throw new Error("회원을 찾을 수 없습니다.");
    
    // 2. 트레이너의 센터 정보 확인
    const trainer = await tx.trainer.findUnique({
      where: { id: data.trainerId },
      select: {
        id: true,
        fitnessCenterId: true
      }
    });
    
    if (!trainer?.fitnessCenterId) throw new Error("트레이너의 센터 정보가 없습니다.");
    
    // 3. PtProduct 생성
    const ptProduct = await tx.ptProduct.create({
      data: {
        title: `${member.user.username}님의 기존수업`,
        price: 0,
        description: `${formatDateWithoutWeekday(new Date())}부터 앱으로 기록 전환.`,
        totalCount: data.totalCount,
        time: data.time,
        onSale: false,
        closedAt: new Date(Date.now() + 30 * 60 * 1000),
        trainer: {
          connect: { id: data.trainerId }
        }
      },
      select: {
        id: true,
        description: true
      }
    });
    
    // 4. Pt 생성
    const pt = await tx.pt.create({
      data: {
        ptProductId: ptProduct.id,
        memberId: data.memberId,
        trainerId: data.trainerId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
        description: ptProduct.description,
        isRegular: false,
        startDate: data.selectedDates[0]
      },
      select: {
        id: true
      }
    });
    
    // 5. 각 날짜에 대해 PtSchedule & PtRecord 생성
    const schedules = [];
    for (const scheduleData of data.schedules) {
      const schedule = await tx.ptSchedule.create({
        data: {
          date: scheduleData.date,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime
          // fitnessCenterId 제거 - PtSchedule 모델에 없음
        },
        select: { id: true }
      });
      
      await tx.ptRecord.create({
        data: {
          ptId: pt.id,
          ptScheduleId: schedule.id,
          fitnessCenterId: trainer.fitnessCenterId // PtRecord에 필수 필드 추가
        }
      });
      
      schedules.push({ 
        date: scheduleData.date, 
        scheduleId: schedule.id,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime
      });
    }
    
    return {
      ptId: pt.id,
      ptProductId: ptProduct.id,
      memberName: member.user.username,
      trainerCenterId: trainer.fitnessCenterId,
      schedulesCount: schedules.length,
      totalCount: data.totalCount
    };
  });
}

export type CreateDirectRegistrationResult = Awaited<ReturnType<typeof createDirectRegistration>>;