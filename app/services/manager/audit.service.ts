import prisma from "@/app/lib/prisma";

// ===== 입력 타입 정의 (서비스파일에서 한다) =====

// 레슨 취소 승인 입력 타입
export type ApproveLessonCancelInput = {
  lessonId: string;
};

// ===== 서비스 함수들 (타입 추론 활용) =====

// 취소된 레슨 목록 조회 (매니저가 관리하는 센터만)
export async function getCanceledLessons(managerId: string) {
  try {
    // 매니저가 관리하는 센터의 취소된 레슨들 조회
    const canceledLessons = await prisma.lesson.findMany({
      where: {
        isCanceled: true,
        fitnessCenter: {
          managers: {
            some: {
              id: managerId, // 매니저가 관리하는 센터만
            },
          },
        },
        OR: [
          // 아직 매니저 확인이 안 된 취소 레슨
          {
            managerCheckedAt: null,
          },
          // 매니저 확인이 완료된 취소 레슨 (CONFIRMED PT만)
          {
            managerCheckedAt: {
              not: null,
            },
            pt: {
              state: "CONFIRMED",
            },
          },
        ],
      },
      select: {
        id: true,
        scheduledAt: true,
        createdAt: true,
        memo: true,
        managerCheckedAt: true,
        pt: {
          select: {
            trainer: {
              select: {
                id: true,
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
        manager: {
          select: {
            user: {
              select: {
                username: true,
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
      orderBy: [
        // managerCheckedAt이 null인 것들을 먼저 (createdAt 최근순)
        {
          managerCheckedAt: {
            sort: "asc",
            nulls: "first",
          },
        },
        // null인 것들 내에서는 createdAt 내림차순
        {
          createdAt: "desc",
        },
        // null이 아닌 것들은 managerCheckedAt 내림차순
        {
          managerCheckedAt: "desc",
        },
      ],
    });

    // 데이터 가공하여 반환
    const formattedLessons = canceledLessons.map((lesson) => ({
      id: lesson.id,
      trainerId: lesson.pt.trainer?.id || "",
      trainerName: lesson.pt.trainer?.user.username || "탈퇴한 회원",
      scheduledAt: lesson.scheduledAt,
      createdAt: lesson.createdAt,
      memo: lesson.memo || "",
      managerCheckedAt: lesson.managerCheckedAt,
      managerName: lesson.manager?.user?.username || null,
      fitnessCenterTitle: lesson.fitnessCenter.title,
      isChecked: lesson.managerCheckedAt !== null,
    }));

    // 확인 대기중과 확인 완료로 분리
    const pendingLessons = formattedLessons.filter((lesson) => !lesson.isChecked);
    const checkedLessons = formattedLessons.filter((lesson) => lesson.isChecked);

    return {
      pendingLessons,
      checkedLessons,
      totalCount: formattedLessons.length,
      pendingCount: pendingLessons.length,
      checkedCount: checkedLessons.length,
    };
  } catch (error) {
    console.error("Get canceled lessons error:", error);
    throw error;
  }
}

// 레슨 취소 승인 처리
export async function approveLessonCancel(
  managerId: string,
  data: ApproveLessonCancelInput
) {
  try {
    const { lessonId } = data;

    // 권한 확인 - 해당 레슨이 매니저가 관리하는 센터의 것인지 체크
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        isCanceled: true,
        managerCheckedAt: null, // 아직 승인되지 않은 것만
        fitnessCenter: {
          managers: {
            some: {
              id: managerId, // 매니저가 관리하는 센터만
            },
          },
        },
      },
      select: {
        id: true,
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
      },
    });

    if (!lesson) {
      throw new Error("해당 레슨을 찾을 수 없거나 권한이 없습니다.");
    }

    // 매니저 승인 처리
    const updatedLesson = await prisma.lesson.update({
      where: {
        id: lessonId,
      },
      data: {
        managerCheckedAt: new Date(),
        managerId: managerId,
      },
      select: {
        id: true,
        scheduledAt: true,
        managerCheckedAt: true,
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
      },
    });

    const trainerName = updatedLesson.pt.trainer?.user.username || "탈퇴한 회원";

    return {
      success: true,
      lesson: {
        id: updatedLesson.id,
        trainerName: trainerName,
        scheduledAt: updatedLesson.scheduledAt,
        checkedAt: updatedLesson.managerCheckedAt,
      },
      message: `${trainerName} 트레이너의 레슨 취소가 승인되었습니다.`,
    };
  } catch (error) {
    console.error("Approve lesson cancel error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "레슨 취소 승인 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// 타입 추론
export type GetCanceledLessonsResult = Awaited<
  ReturnType<typeof getCanceledLessons>
>;
export type ApproveLessonCancelResult = Awaited<
  ReturnType<typeof approveLessonCancel>
>;