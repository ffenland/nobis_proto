// app/services/member/dashboard/dashboard.service.ts
import prisma from "@/app/lib/prisma";

// PT 정보 타입
export interface PtInfo {
  id: string;
  title: string;
  trainer: {
    name: string;
    phone: string | null;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

// 예정된 수업 타입
export interface UpcomingLesson {
  id: string;
  date: string;
  time: string;
  endTime: string;
  duration: number; // 호환성을 위해 유지
}

// 최근 수업 기록 타입
export interface RecentLesson {
  date: string;
  exercises: string[];
}

// PENDING PT 타입
export interface PendingPt {
  id: string;
  title: string;
  trainer: {
    name: string;
    phone: string | null;
  };
  appliedDate: string;
  price: number;
}

// Member Dashboard 데이터 타입
export type MemberDashboardData =
  | {
      type: "confirmed-with-records";
      ptInfo: PtInfo;
      upcomingLesson?: UpcomingLesson;
      recentLesson: RecentLesson;
    }
  | {
      type: "confirmed-no-records";
      ptInfo: PtInfo;
      upcomingLesson: UpcomingLesson;
    }
  | {
      type: "pending-pt";
      pendingPt: PendingPt;
    }
  | {
      type: "no-pt";
    };

// Member Dashboard 데이터 조회 서비스
export const getMemberDashboardData = async (
  memberId: string
): Promise<MemberDashboardData> => {
  const currentDate = new Date();

  // 1. CONFIRMED PT 조회
  const confirmedPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: "CONFIRMED",
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
              mobile: true,
            },
          },
        },
      },
      lessons: {
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          records: {
            select: {
              id: true,
              createdAt: true,
              machineSetRecords: {
                select: {
                  settingValues: {
                    select: {
                      machineSetting: {
                        select: {
                          machine: {
                            select: {
                              title: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              freeSetRecords: {
                select: {
                  freeExercise: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
              stretchingExerciseRecords: {
                select: {
                  stretchingExercise: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          scheduledAt: "desc",
        },
      },
    },
  });

  // 2. CONFIRMED PT가 있는 경우
  if (confirmedPt) {
    // PT 정보 구성
    const ptInfo: PtInfo = {
      id: confirmedPt.id,
      title: confirmedPt.ptProduct.title,
      trainer: {
        name: confirmedPt.trainer?.user.username || "트레이너 미배정",
        phone: confirmedPt.trainer?.user.mobile || null,
      },
      progress: {
        completed: confirmedPt.lessons.filter((l) => l.records.length > 0)
          .length,
        total: confirmedPt.ptProduct.totalCount,
        percentage: Math.round(
          (confirmedPt.lessons.filter((l) => l.records.length > 0).length /
            confirmedPt.ptProduct.totalCount) *
            100
        ),
      },
    };

    // 수업 기록이 있는지 확인
    const lessonsWithRecords = confirmedPt.lessons.filter(
      (lesson) => lesson.records.length > 0
    );
    const hasRecords = lessonsWithRecords.length > 0;

    if (hasRecords) {
      // 최근 수업 기록 추출
      const recentLesson = lessonsWithRecords[0];
      const exercises: string[] = [];

      recentLesson.records.forEach((record) => {
        // Machine 운동
        record.machineSetRecords.forEach((mr) => {
          mr.settingValues.forEach((sv) => {
            const machineTitle = sv.machineSetting.machine.title;
            if (machineTitle && !exercises.includes(machineTitle)) {
              exercises.push(machineTitle);
            }
          });
        });

        // Free 운동
        record.freeSetRecords.forEach((fsr) => {
          if (
            fsr.freeExercise?.title &&
            !exercises.includes(fsr.freeExercise.title)
          ) {
            exercises.push(fsr.freeExercise.title);
          }
        });

        // Stretching 운동
        record.stretchingExerciseRecords.forEach((ser) => {
          if (
            ser.stretchingExercise?.title &&
            !exercises.includes(ser.stretchingExercise.title)
          ) {
            exercises.push(ser.stretchingExercise.title);
          }
        });
      });

      // 예정된 수업 조회
      const upcomingLesson = confirmedPt.lessons.find(
        (lesson) => lesson.scheduledAt > currentDate
      );

      return {
        type: "confirmed-with-records",
        ptInfo,
        upcomingLesson: upcomingLesson
          ? {
              id: upcomingLesson.id,
              date: upcomingLesson.scheduledAt.toLocaleDateString("ko-KR"),
              time: upcomingLesson.scheduledAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              endTime: upcomingLesson.endAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              duration: Math.floor(
                (upcomingLesson.endAt.getTime() -
                  upcomingLesson.scheduledAt.getTime()) /
                  (1000 * 60)
              ), // 호환성을 위해 계산
            }
          : undefined,
        recentLesson: {
          date: recentLesson.scheduledAt.toLocaleDateString("ko-KR"),
          exercises,
        },
      };
    } else {
      // 수업 기록이 없는 경우 - 첫 수업 일정이 반드시 있어야 함
      const firstLesson = confirmedPt.lessons.find(
        (lesson) => lesson.scheduledAt > currentDate
      );

      if (!firstLesson) {
        throw new Error("CONFIRMED PT에 예정된 수업이 없습니다.");
      }

      return {
        type: "confirmed-no-records",
        ptInfo,
        upcomingLesson: {
          id: firstLesson.id,
          date: firstLesson.scheduledAt.toLocaleDateString("ko-KR"),
          time: firstLesson.scheduledAt.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTime: firstLesson.endAt.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          duration: Math.floor(
            (firstLesson.endAt.getTime() - firstLesson.scheduledAt.getTime()) /
              (1000 * 60)
          ), // 호환성을 위해 계산
        },
      };
    }
  }

  // 3. PENDING PT 조회
  const pendingPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: "PENDING",
      startDate: {
        gt: currentDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      ptProduct: {
        select: {
          title: true,
          price: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
              mobile: true,
            },
          },
        },
      },
    },
  });

  if (pendingPt) {
    return {
      type: "pending-pt",
      pendingPt: {
        id: pendingPt.id,
        title: pendingPt.ptProduct.title,
        trainer: {
          name: pendingPt.trainer?.user.username || "트레이너 미배정",
          phone: pendingPt.trainer?.user.mobile || null,
        },
        appliedDate: pendingPt.createdAt.toLocaleDateString("ko-KR"),
        price: pendingPt.ptProduct.price,
      },
    };
  }

  // 4. PT가 없는 경우
  return {
    type: "no-pt",
  };
};
