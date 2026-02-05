import prisma from "@/app/lib/prisma";
import { getKSTMonthStart } from "@/app/lib/utils/time.utils";

// 센터 목록과 매니저 수
export async function getCentersWithManagerCount() {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      managers: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers.map((center) => ({
    id: center.id,
    title: center.title,
    managerCount: center.managers.length,
  }));
}

// 매니저 해임
export async function demoteManager(trainerId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Trainer 조회
    const trainer = await tx.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        isManager: true,
        user: {
          select: {
            id: true,
            managerProfile: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!trainer) {
      throw new Error("트레이너를 찾을 수 없습니다.");
    }

    if (!trainer.isManager) {
      throw new Error("해당 트레이너는 매니저가 아닙니다.");
    }

    // 2. Trainer의 isManager를 false로 변경
    await tx.trainer.update({
      where: { id: trainerId },
      data: {
        isManager: false,
      },
    });

    // 3. Manager 프로필의 센터 연결 모두 해제
    if (trainer.user.managerProfile) {
      await tx.manager.update({
        where: { id: trainer.user.managerProfile.id },
        data: {
          fitnessCenter: {
            set: [], // 모든 센터 연결 해제
          },
        },
      });
    }

    return { success: true, message: "매니저 권한이 해임되었습니다." };
  });
}

// 매니저 임명
export async function promoteToManager(
  trainerId: string,
  centerIds: string[]
) {
  if (!centerIds || centerIds.length === 0) {
    throw new Error("최소 1개 이상의 센터를 선택해야 합니다.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Trainer 조회
    const trainer = await tx.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        isManager: true,
        user: {
          select: {
            id: true,
            managerProfile: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!trainer) {
      throw new Error("트레이너를 찾을 수 없습니다.");
    }

    if (trainer.isManager) {
      throw new Error("이미 매니저입니다.");
    }

    // 2. Manager 프로필 생성 또는 업데이트
    let managerProfile;
    if (trainer.user.managerProfile) {
      // 기존 Manager 프로필이 있으면 센터 연결
      managerProfile = await tx.manager.update({
        where: { id: trainer.user.managerProfile.id },
        data: {
          fitnessCenter: {
            connect: centerIds.map((id) => ({ id })),
          },
        },
        select: {
          id: true,
        },
      });
    } else {
      // Manager 프로필 생성
      managerProfile = await tx.manager.create({
        data: {
          userId: trainer.user.id,
          fitnessCenter: {
            connect: centerIds.map((id) => ({ id })),
          },
        },
        select: {
          id: true,
        },
      });
    }

    // 3. Trainer의 isManager를 true로 변경
    await tx.trainer.update({
      where: { id: trainerId },
      data: {
        isManager: true,
      },
    });

    return {
      success: true,
      message: "매니저로 임명되었습니다.",
      managerId: managerProfile.id,
    };
  });
}

// 트레이너의 레벨 변경 (Trainer 모델의 levelId 변경)
export async function assignLevelToTrainer(
  trainerId: string,
  levelId: string | null
) {
  const trainer = await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      levelId: levelId,
    },
    select: {
      id: true,
      level: {
        select: {
          id: true,
          displayTitle: true,
        },
      },
    },
  });

  return trainer;
}

// 입사일 수정
export async function updateWorkingAt(trainerId: string, workingAt: Date) {
  const trainer = await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      workingAt: workingAt,
    },
    select: {
      id: true,
      workingAt: true,
    },
  });

  return {
    ...trainer,
    workingAt: trainer.workingAt?.toISOString() || null,
  };
}

// 소속 센터 변경
export async function updateTrainerCenter(
  trainerId: string,
  centerId: string
) {
  const trainer = await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return trainer;
}

export const getAllTrainersForLevel = async () => {
  const trainers = await prisma.trainer.findMany({
    where: {
      working: true,
    },
    select: {
      id: true,
      level: {
        select: {
          displayTitle: true,
        },
      },
      user: {
        select: {
          username: true,
          realname: true,
        },
      },
      fitnessCenter: {
        select: {
          title: true,
        },
      },
    },
  });
  return trainers;
};

export async function getAllTrainers() {
  // 이번달 첫날과 현재 시간 (KST 기준)
  const firstDayOfMonth = getKSTMonthStart();
  const now = new Date();

  const trainers = await prisma.trainer.findMany({
    where: {
      working: true,
    },
    select: {
      id: true,
      level: true,
      user: {
        select: {
          id: true,
          username: true,
          realname: true,
          managerProfile: {
            select: {
              id: true,
              fitnessCenter: {
                select: { id: true },
              },
            },
          },
          mobile: true,
          avatarImageId: true,
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      // PT 및 레슨 정보
      pt: {
        where: {
          state: "CONFIRMED",
        },
        select: {
          id: true,
          state: true,
          lessons: {
            where: {
              isCanceled: false,
            },
            select: {
              id: true,
              scheduledAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ working: "desc" }, { user: { username: "asc" } }],
  });

  // 센터별로 그룹화
  const trainersByCenter: {
    [centerId: string]: {
      centerTitle: string;
      trainers: Array<{
        id: string;
        username: string;
        realname: string | null;
        mobile: string | null;
        avatarImageId: string | null;
        level: {
          displayTitle: string;
        } | null;
        isManager: boolean;
        stats: {
          activePtCount: number;
          thisMonthLessonsCount: number;
          scheduledLessonsCount: number;
        };
      }>;
    };
  } = {};

  trainers.forEach((trainer) => {
    const centerId = trainer.fitnessCenter?.id;
    const centerTitle = trainer.fitnessCenter?.title;

    if (!centerId || !centerTitle) return;

    // 센터별 그룹 초기화
    if (!trainersByCenter[centerId]) {
      trainersByCenter[centerId] = {
        centerTitle,
        trainers: [],
      };
    }

    // 매니저 여부 확인: managerProfile에 해당 센터가 연결되어 있는지
    const isManager = trainer.user.managerProfile
      ? trainer.user.managerProfile.fitnessCenter.some(
          (center) => center.id === centerId
        )
      : false;

    // 통계 계산
    const activePtCount = trainer.pt.length; // CONFIRMED PT 개수

    // 이번달 진행된 레슨 (scheduledAt >= firstDayOfMonth && scheduledAt <= now)
    const thisMonthLessonsCount = trainer.pt
      .flatMap((pt) => pt.lessons)
      .filter(
        (lesson) =>
          lesson.scheduledAt >= firstDayOfMonth && lesson.scheduledAt <= now
      ).length;

    // 예약된 레슨 (scheduledAt > now)
    const scheduledLessonsCount = trainer.pt
      .flatMap((pt) => pt.lessons)
      .filter((lesson) => lesson.scheduledAt > now).length;

    trainersByCenter[centerId].trainers.push({
      id: trainer.id,
      username: trainer.user.username,
      realname: trainer.user.realname,
      mobile: trainer.user.mobile,
      avatarImageId: trainer.user.avatarImageId,
      level: trainer.level,
      isManager,
      stats: {
        activePtCount,
        thisMonthLessonsCount,
        scheduledLessonsCount,
      },
    });
  });

  return trainersByCenter;
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
        workingAt: true,
        isManager: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            realname: true,
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
        title: "asc",
      },
    }),
  ]);

  if (!trainer) {
    return null;
  }

  // 현재 월의 시작과 끝
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // 이번달 수업 횟수 계산
  const thisMonthLessons = trainer.pt
    .flatMap((pt) => pt.lessons)
    .filter((lesson) => {
      const lessonDate = new Date(lesson.scheduledAt);
      return (
        lessonDate >= startOfMonth &&
        lessonDate <= endOfMonth &&
        !lesson.isCanceled
      );
    }).length;

  return {
    id: trainer.id,
    username: trainer.user.username,
    realname: trainer.user.realname,
    email: trainer.user.email,
    mobile: trainer.user.mobile,
    avatarImageId: trainer.user.avatarImageId,
    introduce: trainer.introduce,
    level: trainer.level,
    working: trainer.working,
    workingAt: trainer.workingAt?.toISOString() || null,
    isManager: trainer.isManager,
    createdAt: trainer.createdAt.toISOString(),
    updatedAt: trainer.updatedAt.toISOString(),
    fitnessCenter: trainer.fitnessCenter
      ? {
          id: trainer.fitnessCenter.id,
          title: trainer.fitnessCenter.title,
          address: trainer.fitnessCenter.address,
          phone: trainer.fitnessCenter.phone,
        }
      : null,
    groupId: trainer.group?.id || null,
    stats: {
      activePt: trainer.pt.filter((pt) => pt.state === "CONFIRMED").length,
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
    level?: "JUNIOR" | "ASSOCIATE" | "SENIOR" | "MASTER";
    fitnessCenterId?: string | null;
  }
) {
  // 레벨 변경이 없는 경우 기존 로직 사용
  const updatedTrainer = await prisma.trainer.update({
    where: { id: trainerId },
    data: {
      ...(data.fitnessCenterId !== undefined && {
        fitnessCenterId: data.fitnessCenterId,
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

// 트레이너 변환용 회원 검색
export async function searchMembersForTrainerConversion(searchQuery?: string) {
  // 검색어가 없으면 빈 배열 반환
  if (!searchQuery || searchQuery.trim() === "") {
    return [];
  }

  const whereCondition = {
    // Member 프로필이 있고 Trainer 프로필이 없는 유저
    memberProfile: {
      isNot: null,
    },
    trainerProfile: null,
    // username 또는 realname에서 검색
    OR: [
      {
        username: {
          contains: searchQuery.trim(),
          mode: "insensitive" as const,
        },
      },
      {
        realname: {
          contains: searchQuery.trim(),
          mode: "insensitive" as const,
        },
      },
    ],
  };

  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      username: true,
      realname: true,
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
      username: "asc",
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    realname: user.realname,
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
    realname: string;
    levelId?: string;
    fitnessCenterId?: string;
  }
) {
  const result = await prisma.$transaction(async (tx) => {
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
      throw new Error("유저를 찾을 수 없습니다.");
    }

    if (!user.memberProfile) {
      throw new Error("회원 프로필이 존재하지 않습니다.");
    }

    if (user.trainerProfile) {
      throw new Error("이미 트레이너 프로필이 존재합니다.");
    }

    // 2. 레벨 존재 확인 (levelId가 제공된 경우에만)
    if (data.levelId) {
      const level = await tx.trainerLevel.findUnique({
        where: { id: data.levelId },
        select: { id: true },
      });

      if (!level) {
        throw new Error("존재하지 않는 트레이너 레벨입니다.");
      }
    }

    // 3. 트레이너 프로필 생성
    const newTrainer = await tx.trainer.create({
      data: {
        userId: userId,
        levelId: data.levelId || null,
        fitnessCenterId: data.fitnessCenterId || null,
        introduce: "안녕하세요",
        working: true,
      },
      select: {
        id: true,
      },
    });

    // 4. 회원 프로필 삭제
    await tx.member.delete({
      where: { id: user.memberProfile.id },
    });

    // 5. 유저 역할을 TRAINER로 변경하고 realname 업데이트
    await tx.user.update({
      where: { id: userId },
      data: {
        role: "TRAINER",
        realname: data.realname,
      },
    });

    return {
      trainerId: newTrainer.id,
    };
  });

  return result;
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

// 매니저 변환용 사용자 검색 (MEMBER + TRAINER 대상)
export async function searchUsersForManagerConversion(searchQuery?: string) {
  // 검색어가 없으면 빈 배열 반환
  if (!searchQuery || searchQuery.trim() === "") {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [{ role: "MEMBER" }, { role: "TRAINER" }],
      managerProfile: { is: null },
      username: {
        contains: searchQuery.trim(),
        mode: "insensitive" as const,
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      avatarImageId: true,
      memberProfile: {
        select: {
          id: true,
          active: true,
          createdAt: true,
        },
      },
      trainerProfile: {
        select: {
          id: true,
          level: true,
          working: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      username: "asc",
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    avatarImageId: user.avatarImageId,
    memberProfile: user.memberProfile,
    trainerProfile: user.trainerProfile,
  }));
}

// 트레이너를 매니저로 변환 (복수 센터 연결 지원)
// MANAGER는 TRAINER + 센터 뷰잉 권한이므로 TRAINER 프로필 필수
export async function convertTrainerToManager(
  userId: string,
  fitnessCenterIds?: string[]
) {
  return await prisma.$transaction(async (tx) => {
    // 1. 현재 유저 정보 확인
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        trainerProfile: { select: { id: true } },
        managerProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new Error("유저를 찾을 수 없습니다.");
    }

    if (user.managerProfile) {
      throw new Error("이미 매니저 프로필이 존재합니다.");
    }

    if (!user.trainerProfile) {
      throw new Error(
        "트레이너 프로필이 필요합니다. 매니저는 트레이너만 변환할 수 있습니다."
      );
    }

    // 2. 매니저 프로필 생성 (복수 센터 연결)
    const newManager = await tx.manager.create({
      data: {
        userId: userId,
        ...(fitnessCenterIds &&
          fitnessCenterIds.length > 0 && {
            fitnessCenter: {
              connect: fitnessCenterIds.map((id) => ({ id })),
            },
          }),
      },
      select: {
        id: true,
        userId: true,
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 3. 유저 역할을 MANAGER로 변경
    await tx.user.update({
      where: { id: userId },
      data: {
        role: "MANAGER",
      },
    });

    // 4. 트레이너 프로필은 유지 (role-switch 기능을 위해 필요)

    return {
      managerId: newManager.id,
      userId: newManager.userId,
      previousRole: user.role,
      assignedCenters: newManager.fitnessCenter,
    };
  });
}

// 트레이너 레벨 생성
export async function createTrainerLevel(data: {
  title: string;
  displayTitle: string;
  trainerIds?: string[];
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. 중복 확인
    const existing = await tx.trainerLevel.findFirst({
      where: {
        OR: [{ title: data.title }, { displayTitle: data.displayTitle }],
      },
    });

    if (existing) {
      throw new Error("이미 존재하는 레벨명 또는 표시명입니다.");
    }

    // 2. 레벨 생성
    const newLevel = await tx.trainerLevel.create({
      data: {
        title: data.title,
        displayTitle: data.displayTitle,
      },
      select: {
        id: true,
        title: true,
        displayTitle: true,
      },
    });

    // 3. 트레이너 할당 (있는 경우)
    if (data.trainerIds && data.trainerIds.length > 0) {
      await tx.trainer.updateMany({
        where: {
          id: { in: data.trainerIds },
        },
        data: {
          levelId: newLevel.id,
        },
      });
    }

    return newLevel;
  });
}

// 트레이너 레벨 수정
export async function updateTrainerLevel(
  levelId: string,
  data: {
    title?: string;
    displayTitle?: string;
    trainerIds?: string[];
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. 레벨 존재 확인
    const existingLevel = await tx.trainerLevel.findUnique({
      where: { id: levelId },
    });

    if (!existingLevel) {
      throw new Error("레벨을 찾을 수 없습니다.");
    }

    // 2. 중복 확인 (변경하려는 값이 다른 레벨과 충돌하는지)
    if (data.title || data.displayTitle) {
      const duplicate = await tx.trainerLevel.findFirst({
        where: {
          id: { not: levelId },
          OR: [
            ...(data.title ? [{ title: data.title }] : []),
            ...(data.displayTitle ? [{ displayTitle: data.displayTitle }] : []),
          ],
        },
      });

      if (duplicate) {
        throw new Error(
          "이미 다른 레벨에서 사용 중인 레벨명 또는 표시명입니다."
        );
      }
    }

    // 3. 레벨 정보 업데이트
    const updatedLevel = await tx.trainerLevel.update({
      where: { id: levelId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.displayTitle && { displayTitle: data.displayTitle }),
      },
      select: {
        id: true,
        title: true,
        displayTitle: true,
      },
    });

    // 4. 트레이너 재할당 (trainerIds가 제공된 경우)
    if (data.trainerIds !== undefined) {
      // 기존에 이 레벨에 할당된 모든 트레이너의 레벨을 null로 설정
      await tx.trainer.updateMany({
        where: {
          levelId: levelId,
        },
        data: {
          levelId: null,
        },
      });

      // 새로 선택된 트레이너들에게 이 레벨 할당
      if (data.trainerIds.length > 0) {
        await tx.trainer.updateMany({
          where: {
            id: { in: data.trainerIds },
          },
          data: {
            levelId: levelId,
          },
        });
      }
    }

    return updatedLevel;
  });
}
// 모든 레벨 단순조회
export const getAllTrainerLevelsSimple = async () => {
  return await prisma.trainerLevel.findMany({
    select: {
      id: true,
      displayTitle: true,
      title: true,
    },
  });
};

// 모든 트레이너 레벨 조회
export async function getAllTrainerLevels() {
  const levels = await prisma.trainerLevel.findMany({
    select: {
      id: true,
      title: true,
      displayTitle: true,
      _count: {
        select: {
          trainers: true,
          ptProducts: {
            where: {
              ptProduct: {
                onSale: true,
              },
            },
          },
        },
      },
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              realname: true,
            },
          },
          fitnessCenter: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return levels.map((level) => ({
    id: level.id,
    title: level.title,
    displayTitle: level.displayTitle,
    trainerCount: level._count.trainers,
    trainers: level.trainers.map((t) => ({
      id: t.id,
      realname: t.user.realname,
      fitnessCenter: t.fitnessCenter?.title,
    })),
    ptProductCount: level._count.ptProducts,
  }));
}

// 타입 추론
export type IAllTrainersForLevel = Awaited<
  ReturnType<typeof getAllTrainersForLevel>
>;
export type GetAllTrainersResult = Awaited<ReturnType<typeof getAllTrainers>>;
export type GetTrainerByIdResult = Awaited<ReturnType<typeof getTrainerById>>;
export type UpdateTrainerResult = Awaited<ReturnType<typeof updateTrainer>>;
export type SearchMembersResult = Awaited<
  ReturnType<typeof searchMembersForTrainerConversion>
>;
export type SearchMemberItem = SearchMembersResult[0];
export type ConvertToTrainerResult = Awaited<
  ReturnType<typeof convertMemberToTrainer>
>;
export type GetTrainerOffsResult = Awaited<ReturnType<typeof getTrainerOffs>>;
export type UpdateTrainerOffStateResult = Awaited<
  ReturnType<typeof updateTrainerOffState>
>;
export type SearchUsersForManagerResult = Awaited<
  ReturnType<typeof searchUsersForManagerConversion>
>;
export type SearchUserItem = SearchUsersForManagerResult[0];
export type ConvertToManagerResult = Awaited<
  ReturnType<typeof convertTrainerToManager>
>;
export type IAllTrainerLevelsSimple = Awaited<
  ReturnType<typeof getAllTrainerLevelsSimple>
>;
export type GetAllTrainerLevelsResult = Awaited<
  ReturnType<typeof getAllTrainerLevels>
>;
export type TrainerLevelItem = GetAllTrainerLevelsResult[0];
export type CreateTrainerLevelResult = Awaited<
  ReturnType<typeof createTrainerLevel>
>;
export type UpdateTrainerLevelResult = Awaited<
  ReturnType<typeof updateTrainerLevel>
>;
export type GetCentersWithManagerCountResult = Awaited<
  ReturnType<typeof getCentersWithManagerCount>
>;
export type CenterWithManagerCount = GetCentersWithManagerCountResult[0];
export type DemoteManagerResult = Awaited<ReturnType<typeof demoteManager>>;
export type PromoteToManagerResult = Awaited<
  ReturnType<typeof promoteToManager>
>;
export type AssignLevelToTrainerResult = Awaited<
  ReturnType<typeof assignLevelToTrainer>
>;
export type UpdateWorkingAtResult = Awaited<ReturnType<typeof updateWorkingAt>>;
export type UpdateTrainerCenterResult = Awaited<
  ReturnType<typeof updateTrainerCenter>
>;
