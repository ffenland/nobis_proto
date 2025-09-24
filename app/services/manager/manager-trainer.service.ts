import prisma from "@/app/lib/prisma";

export async function getAllTrainers() {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      introduce: true,
      level: true,
      working: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          avatarImageId: true,
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
          address: true,
          phone: true,
        },
      },
      group: {
        select: {
          id: true,
        },
      },
      // PT 통계
      pt: {
        select: {
          id: true,
          state: true,
          lessons: {
            select: {
              id: true,
              scheduledAt: true,
              endAt: true,
              isCanceled: true,
              records: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: {
              scheduledAt: 'desc',
            },
            take: 5, // 최근 5개 수업만
          },
        },
      },
    },
    orderBy: [
      { working: 'desc' },
      { user: { username: 'asc' } },
    ],
  });

  return trainers.map(trainer => {
    // 모든 lessons 중 가장 최근 수업
    const allLessons = trainer.pt.flatMap(pt => pt.lessons).sort((a, b) => 
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
    
    const recentLesson = allLessons[0];

    return {
      id: trainer.id,
      username: trainer.user.username,
      email: trainer.user.email,
      mobile: trainer.user.mobile,
      avatarImageId: trainer.user.avatarImageId,
      introduce: trainer.introduce,
      level: trainer.level,
      working: trainer.working,
      createdAt: trainer.createdAt,
      updatedAt: trainer.updatedAt,
      fitnessCenter: trainer.fitnessCenter ? {
        id: trainer.fitnessCenter.id,
        title: trainer.fitnessCenter.title,
        address: trainer.fitnessCenter.address,
        phone: trainer.fitnessCenter.phone,
      } : null,
      groupId: trainer.group?.id || null,
      // PT 통계
      stats: {
        totalPt: trainer.pt.length,
        activePt: trainer.pt.filter(pt => pt.state === 'CONFIRMED').length,
        pendingPt: trainer.pt.filter(pt => pt.state === 'PENDING').length,
        finishedPt: trainer.pt.filter(pt => pt.state === 'FINISHED').length,
        rejectedPt: trainer.pt.filter(pt => pt.state === 'REJECTED').length,
      },
      recentLesson: recentLesson ? {
        id: recentLesson.id,
        scheduledAt: recentLesson.scheduledAt,
        endAt: recentLesson.endAt,
        isCanceled: recentLesson.isCanceled,
        hasRecords: recentLesson.records.length > 0,
      } : null,
    };
  });
}

// 특정 트레이너 상세 정보 조회 (센터 목록 포함)
export async function getTrainerById(trainerId: string) {
  const [trainer, centerList] = await Promise.all([
    prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        introduce: true,
        level: true,
        working: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            mobile: true,
            avatarImageId: true,
          },
        },
        fitnessCenter: {
          select: {
            id: true,
            title: true,
            address: true,
            phone: true,
          },
        },
        group: {
          select: {
            id: true,
          },
        },
        pt: {
          select: {
            id: true,
            state: true,
            createdAt: true,
            lessons: {
              select: {
                id: true,
                scheduledAt: true,
                endAt: true,
                isCanceled: true,
                records: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    // 피트니스 센터 목록도 함께 조회
    prisma.fitnessCenter.findMany({
      where: {
        inOperation: true,
      },
      select: {
        id: true,
        title: true,
        address: true,
      },
      orderBy: {
        title: 'asc',
      },
    })
  ]);

  if (!trainer) {
    return null;
  }

  // 현재 월의 시작과 끝
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 이번달 수업 횟수 계산
  const thisMonthLessons = trainer.pt.flatMap(pt => pt.lessons).filter(lesson => {
    const lessonDate = new Date(lesson.scheduledAt);
    return lessonDate >= startOfMonth && lessonDate <= endOfMonth && !lesson.isCanceled;
  }).length;

  return {
    id: trainer.id,
    username: trainer.user.username,
    email: trainer.user.email,
    mobile: trainer.user.mobile,
    avatarImageId: trainer.user.avatarImageId,
    introduce: trainer.introduce,
    level: trainer.level,
    working: trainer.working,
    createdAt: trainer.createdAt,
    updatedAt: trainer.updatedAt,
    fitnessCenter: trainer.fitnessCenter ? {
      id: trainer.fitnessCenter.id,
      title: trainer.fitnessCenter.title,
      address: trainer.fitnessCenter.address,
      phone: trainer.fitnessCenter.phone,
    } : null,
    groupId: trainer.group?.id || null,
    stats: {
      activePt: trainer.pt.filter(pt => pt.state === 'CONFIRMED').length,
      totalPt: trainer.pt.length,
      thisMonthLessons,
    },
    // 센터 목록 추가
    centerList,
  };
}


// 트레이너 정보 업데이트 (레벨 변경 시 PtProduct 연결 자동 조정)
export async function updateTrainer(
  trainerId: string,
  data: {
    level?: 'JUNIOR' | 'ASSOCIATE' | 'SENIOR' | 'MASTER';
    fitnessCenterId?: string | null;
  }
) {
  // 레벨 변경이 있는 경우 트랜잭션으로 처리
  if (data.level) {
    return await updateTrainerWithPtProducts(trainerId, data);
  }
  
  // 레벨 변경이 없는 경우 기존 로직 사용
  const updatedTrainer = await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      ...(data.fitnessCenterId !== undefined && { 
        fitnessCenterId: data.fitnessCenterId 
      }),
    },
    select: {
      id: true,
      level: true,
      fitnessCenterId: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return updatedTrainer;
}

// 트레이너 레벨 변경 시 PtProduct 연결 자동 조정
async function updateTrainerWithPtProducts(
  trainerId: string,
  data: {
    level?: 'JUNIOR' | 'ASSOCIATE' | 'SENIOR' | 'MASTER';
    fitnessCenterId?: string | null;
  }
) {
  if (!data.level) {
    throw new Error('레벨 정보가 필요합니다.');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. 현재 트레이너 정보 조회
    const currentTrainer = await tx.trainer.findUnique({
      where: { id: trainerId },
      select: { level: true }
    });

    if (!currentTrainer) {
      throw new Error('트레이너를 찾을 수 없습니다.');
    }

    // 레벨이 실제로 변경되는 경우에만 PtProduct 연결 조정
    if (currentTrainer.level !== data.level) {
      // 2. 이전 레벨의 PtProduct에서 해당 트레이너만 제거
      const oldLevelProducts = await tx.ptProduct.findMany({
        where: {
          trainerLevel: { has: currentTrainer.level },
          onSale: true,
          trainer: { some: { id: trainerId } }
        },
        select: { id: true }
      });

      // 각 상품에서 트레이너 연결 해제
      for (const product of oldLevelProducts) {
        await tx.ptProduct.update({
          where: { id: product.id },
          data: {
            trainer: {
              disconnect: { id: trainerId }
            }
          }
        });
      }

      // 3. 새 레벨의 PtProduct에 해당 트레이너 추가
      const newLevelProducts = await tx.ptProduct.findMany({
        where: {
          trainerLevel: { has: data.level },
          onSale: true,
          NOT: {
            trainer: { some: { id: trainerId } }
          }
        },
        select: { id: true }
      });

      // 각 상품에 트레이너 연결
      for (const product of newLevelProducts) {
        await tx.ptProduct.update({
          where: { id: product.id },
          data: {
            trainer: {
              connect: { id: trainerId }
            }
          }
        });
      }
    }

    // 4. 트레이너 정보 업데이트
    const updatedTrainer = await tx.trainer.update({
      where: { id: trainerId },
      data: {
        level: data.level,
        ...(data.fitnessCenterId !== undefined && { 
          fitnessCenterId: data.fitnessCenterId 
        }),
      },
      select: {
        id: true,
        level: true,
        fitnessCenterId: true,
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return updatedTrainer;
  });
}

// 트레이너 변환용 회원 검색
export async function searchMembersForTrainerConversion(searchQuery?: string) {
  // 검색어가 없으면 빈 배열 반환
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  const whereCondition = {
    // Member 프로필이 있고 Trainer 프로필이 없는 유저
    memberProfile: {
      isNot: null,
    },
    trainerProfile: null,
    username: {
      contains: searchQuery.trim(),
      mode: "insensitive" as const,
    },
  };

  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      avatarImage: {
        select: {
          cloudflareId: true,
        },
      },
      memberProfile: {
        select: {
          id: true,
          active: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      username: 'asc',
    },
  });

  return users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    avatarImageId: user.avatarImage?.cloudflareId || null,
    memberActive: user.memberProfile?.active || false,
    memberCreatedAt: user.memberProfile?.createdAt,
  }));
}

// 회원을 트레이너로 변환
export async function convertMemberToTrainer(
  userId: string,
  data: {
    level: 'JUNIOR' | 'ASSOCIATE' | 'SENIOR' | 'MASTER';
    fitnessCenterId?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. 현재 유저 정보 확인
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        memberProfile: { select: { id: true } },
        trainerProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new Error('유저를 찾을 수 없습니다.');
    }

    if (!user.memberProfile) {
      throw new Error('회원 프로필이 존재하지 않습니다.');
    }

    if (user.trainerProfile) {
      throw new Error('이미 트레이너 프로필이 존재합니다.');
    }

    // 2. 트레이너 프로필 생성
    const newTrainer = await tx.trainer.create({
      data: {
        userId: userId,
        level: data.level,
        fitnessCenterId: data.fitnessCenterId || null,
        introduce: "안녕하세요",
        working: true,
      },
      select: {
        id: true,
        level: true,
        fitnessCenterId: true,
      },
    });

    // 3. 해당 레벨의 PtProduct에 트레이너 연결
    const levelProducts = await tx.ptProduct.findMany({
      where: {
        trainerLevel: { has: data.level },
        onSale: true,
      },
      select: { id: true },
    });

    // 각 상품에 트레이너 연결
    for (const product of levelProducts) {
      await tx.ptProduct.update({
        where: { id: product.id },
        data: {
          trainer: {
            connect: { id: newTrainer.id },
          },
        },
      });
    }

    // 4. 회원 프로필 삭제
    await tx.member.delete({
      where: { id: user.memberProfile.id },
    });

    // 5. 유저 역할을 TRAINER로 변경
    await tx.user.update({
      where: { id: userId },
      data: {
        role: 'TRAINER',
      },
    });

    return {
      trainerId: newTrainer.id,
      level: newTrainer.level,
      fitnessCenterId: newTrainer.fitnessCenterId,
    };
  });
}

// 매니저가 관리하는 센터의 TrainerOff 목록 조회
export async function getTrainerOffs(managerId: string) {
  try {
    // 현재 월의 첫 날
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const trainerOffs = await prisma.trainerOff.findMany({
      where: {
        trainer: {
          fitnessCenter: {
            managers: {
              some: {
                id: managerId, // 매니저가 관리하는 센터의 트레이너만
              },
            },
          },
        },
        OR: [
          {
            state: "PENDING", // PENDING 상태는 모든 기간
          },
          {
            state: "CONFIRMED",
            startAt: {
              gte: firstDayOfMonth, // 이번 달 이후의 CONFIRMED
            },
          },
          {
            state: "REJECTED",
            startAt: {
              gte: firstDayOfMonth, // 이번 달 이후의 REJECTED
            },
          },
        ],
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        state: true,
        description: true,
        createdAt: true,
        stateUpdatedAt: true,
        trainer: {
          select: {
            id: true,
            user: {
              select: {
                username: true,
              },
            },
            fitnessCenter: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          // PENDING, CONFIRMED, REJECTED 순서로 정렬
          state: "asc",
        },
        {
          // 같은 state 내에서는 startAt이 빠른 순으로
          startAt: "asc",
        },
      ],
    });

    return trainerOffs;
  } catch (error) {
    console.error("Get trainer offs error:", error);
    throw error;
  }
}

// TrainerOff 상태 변경 (POST 요청용)
export type UpdateTrainerOffStateInput = {
  id: string;
  state: "PENDING" | "CONFIRMED" | "REJECTED";
};

export async function updateTrainerOffState(
  managerId: string,
  input: UpdateTrainerOffStateInput
) {
  try {
    const { id, state } = input;

    // 권한 확인: 매니저가 관리하는 센터의 트레이너 휴무만 수정 가능
    const trainerOff = await prisma.trainerOff.findFirst({
      where: {
        id: id,
        trainer: {
          fitnessCenter: {
            managers: {
              some: {
                id: managerId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        state: true,
      },
    });

    if (!trainerOff) {
      throw new Error("권한이 없거나 존재하지 않는 휴무 신청입니다.");
    }

    // 상태 업데이트
    const updatedTrainerOff = await prisma.trainerOff.update({
      where: {
        id: id,
      },
      data: {
        state: state,
        stateUpdatedAt: new Date(),
      },
      select: {
        id: true,
        state: true,
        stateUpdatedAt: true,
      },
    });

    return updatedTrainerOff;
  } catch (error) {
    console.error("Update trainer off state error:", error);
    throw error;
  }
}

// 타입 추론
export type GetAllTrainersResult = Awaited<ReturnType<typeof getAllTrainers>>;
export type TrainerListItem = GetAllTrainersResult[0];
export type GetTrainerByIdResult = Awaited<ReturnType<typeof getTrainerById>>;
export type UpdateTrainerResult = Awaited<ReturnType<typeof updateTrainer>>;
export type SearchMembersResult = Awaited<ReturnType<typeof searchMembersForTrainerConversion>>;
export type SearchMemberItem = SearchMembersResult[0];
export type ConvertToTrainerResult = Awaited<ReturnType<typeof convertMemberToTrainer>>;
export type GetTrainerOffsResult = Awaited<ReturnType<typeof getTrainerOffs>>;
export type UpdateTrainerOffStateResult = Awaited<ReturnType<typeof updateTrainerOffState>>;