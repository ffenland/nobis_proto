// app/lib/services/trainer-management.service.ts

import prisma from "@/app/lib/prisma";

// ===== 입력 타입 정의 =====
export interface ITrainerListFilters {
  centerId?: string;
  search?: string;
}

export interface ITrainerDetailParams {
  trainerId: string;
  centerId?: string;
}

export interface IPtListFilters {
  trainerId: string;
  state?: "ALL" | "PENDING" | "CONFIRMED" | "REJECTED";
  dateFrom?: string;
  dateTo?: string;
}

export interface IPtRecordFilters {
  ptId: string;
  completed?: boolean;
}

// ===== 서비스 클래스 =====
export class TrainerManagementService {
  private static instance: TrainerManagementService;

  static getInstance() {
    if (!this.instance) {
      this.instance = new TrainerManagementService();
    }
    return this.instance;
  }

  // 트레이너 목록 및 통계 조회 (센터별 그룹화)
  async getTrainersWithStats(filters: ITrainerListFilters = {}) {
    const { centerId, search } = filters;

    // 기본 조건
    const where = {
      working: true,
      ...(centerId && { fitnessCenterId: centerId }),
      ...(search && {
        user: {
          username: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      }),
    };

    // 트레이너 목록 조회
    const trainers = await prisma.trainer.findMany({
      where,
      select: {
        id: true,
        working: true,
        createdAt: true,
        introduce: true,
        user: {
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
          },
        },
        fitnessCenter: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        pt: {
          where: {
            state: "CONFIRMED",
            trainerConfirmed: true,
          },
          select: {
            id: true,
            createdAt: true,
            startDate: true,
            member: {
              select: {
                id: true,
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
            ptRecord: {
              select: {
                id: true,
                createdAt: true,
                ptSchedule: {
                  select: {
                    date: true,
                    startTime: true,
                  },
                },
                items: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { fitnessCenter: { title: "asc" } },
        { user: { username: "asc" } },
      ],
    });

    // 통계 계산
    const trainersWithStats = trainers.map((trainer) => {
      // 이번 달 시작/끝 날짜
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // 진행 중인 PT 개수
      const activePtCount = trainer.pt.length;

      // 총 담당 회원 수 (중복 제거)
      const uniqueMembers = new Set(
        trainer.pt.map((pt) => pt.member?.id).filter(Boolean)
      );
      const totalMemberCount = uniqueMembers.size;

      // 이번 달 완료된 수업 횟수
      const thisMonthCompletedSessions = trainer.pt.reduce((total, pt) => {
        return (
          total +
          pt.ptRecord.filter((record) => {
            const recordDate = new Date(record.ptSchedule.date);
            return (
              record.items.length > 0 && // 기록이 있는 것만
              recordDate >= thisMonthStart &&
              recordDate <= thisMonthEnd
            );
          }).length
        );
      }, 0);

      // 평균 수업 완료율 계산
      const totalScheduled = trainer.pt.reduce(
        (total, pt) => total + pt.ptRecord.length,
        0
      );
      const totalCompleted = trainer.pt.reduce(
        (total, pt) =>
          total +
          pt.ptRecord.filter((record) => record.items.length > 0).length,
        0
      );
      const completionRate =
        totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;

      return {
        ...trainer,
        stats: {
          activePtCount,
          totalMemberCount,
          thisMonthCompletedSessions,
          completionRate: Math.round(completionRate * 10) / 10, // 소수점 1자리
        },
      };
    });

    // 센터별로 그룹화
    const groupedByCenter = trainersWithStats.reduce((acc, trainer) => {
      const centerId = trainer.fitnessCenter?.id || "no-center";
      const centerTitle = trainer.fitnessCenter?.title || "센터 미배정";

      if (!acc[centerId]) {
        acc[centerId] = {
          id: centerId,
          title: centerTitle,
          address: trainer.fitnessCenter?.address || "",
          trainers: [],
        };
      }

      acc[centerId].trainers.push(trainer);
      return acc;
    }, {} as Record<string, { id: string; title: string; address: string; trainers: typeof trainersWithStats }>);

    return Object.values(groupedByCenter);
  }

  // 특정 트레이너 상세 정보 조회 (근무시간 포함)
  async getTrainerDetail(params: ITrainerDetailParams) {
    const { trainerId } = params;

    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        working: true,
        createdAt: true,
        introduce: true,
        user: {
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
          },
        },
        fitnessCenter: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        workingHours: {
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    if (!trainer) {
      throw new Error("트레이너를 찾을 수 없습니다.");
    }

    return {
      ...trainer,
      createdAt: trainer.createdAt.toISOString(),
    };
  }

  // 특정 트레이너의 PT 목록 조회
  async getTrainerPtList(filters: IPtListFilters) {
    const { trainerId, state, dateFrom, dateTo } = filters;

    // 필터 조건 설정
    const where = {
      trainerId,
      ...(state && state !== "ALL" && { state }),
      ...(dateFrom &&
        dateTo && {
          startDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        }),
    };

    const ptList = await prisma.pt.findMany({
      where,
      select: {
        id: true,
        state: true,
        trainerConfirmed: true,
        startDate: true,
        isRegular: true,
        description: true,
        createdAt: true,
        ptProduct: {
          select: {
            id: true,
            title: true,
            price: true,
            totalCount: true,
            time: true,
          },
        },
        member: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                username: true,
                avatarImage: {
                  select: {
                    cloudflareId: true,
                  },
                },
              },
            },
          },
        },
        ptRecord: {
          select: {
            id: true,
            createdAt: true,
            ptSchedule: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // PT별 통계 계산
    const ptListWithStats = ptList.map((pt) => {
      const totalSessions = pt.ptRecord.length;
      const completedSessions = pt.ptRecord.filter(
        (record) => record.items.length > 0
      ).length;
      const completionRate =
        totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      // 다음 예정 수업
      const now = new Date();
      const nextSession = pt.ptRecord
        .filter((record) => {
          const sessionDate = new Date(record.ptSchedule.date);
          return sessionDate >= now && record.items.length === 0;
        })
        .sort((a, b) => {
          const dateA = new Date(a.ptSchedule.date);
          const dateB = new Date(b.ptSchedule.date);
          return dateA.getTime() - dateB.getTime();
        })[0];

      return {
        ...pt,
        stats: {
          totalSessions,
          completedSessions,
          completionRate: Math.round(completionRate * 10) / 10,
          nextSession: nextSession || null,
        },
      };
    });

    return ptListWithStats;
  }

  // 특정 PT의 수업 기록 상세 조회
  async getPtRecordDetails(filters: IPtRecordFilters) {
    const { ptId, completed } = filters;

    // 필터 조건 설정
    const where = {
      ptId,
      ...(completed !== undefined && {
        items: completed ? { some: { id: { not: undefined } } } : { none: {} },
      }),
    };

    const ptRecords = await prisma.ptRecord.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        memo: true,
        pt: {
          select: {
            id: true,
            ptProduct: {
              select: {
                title: true,
                time: true,
              },
            },
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
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
        ptSchedule: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        fitnessCenter: {
          select: {
            title: true,
          },
        },
        items: {
          select: {
            id: true,
            entry: true,
            title: true,
            type: true,
            description: true,
            isActive: true,
            machineSetRecords: {
              select: {
                id: true,
                set: true,
                reps: true,
                settingValues: {
                  select: {
                    id: true,
                    value: true,
                    machineSetting: {
                      select: {
                        title: true,
                        unit: true,
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
                id: true,
                set: true,
                reps: true,
                equipments: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    primaryValue: true,
                    primaryUnit: true,
                  },
                },
              },
            },
            stretchingExerciseRecords: {
              select: {
                id: true,
                description: true,
                equipments: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    primaryValue: true,
                    primaryUnit: true,
                  },
                },
                stretchingExercise: {
                  select: {
                    title: true,
                    description: true,
                  },
                },
              },
            },
            images: {
              select: {
                id: true,
                cloudflareId: true,
                originalName: true,
              },
            },
          },
          orderBy: {
            entry: "asc",
          },
        },
      },
      orderBy: {
        ptSchedule: {
          date: "desc",
        },
      },
    });

    // 각 기록에 시간 분석 추가 (수업 시작 X분 후 기록됨)
    const recordsWithTimeAnalysis = ptRecords.map((record) => {
      const scheduleDate = new Date(record.ptSchedule.date);
      const startTime = record.ptSchedule.startTime;

      // 시간 변환: 900 -> 09:00
      const hours = Math.floor(startTime / 100);
      const minutes = startTime % 100;

      // 실제 수업 시작 시간
      const sessionStartTime = new Date(scheduleDate);
      sessionStartTime.setHours(hours, minutes, 0, 0);

      // 기록 생성 시간과의 차이 (분 단위)
      const recordedAt = new Date(record.createdAt);
      const timeDifferenceMs =
        recordedAt.getTime() - sessionStartTime.getTime();
      const timeDifferenceMinutes = Math.round(timeDifferenceMs / (1000 * 60));

      return {
        ...record,
        timeAnalysis: {
          sessionStartTime,
          recordedAt,
          minutesAfterStart: timeDifferenceMinutes,
          isRecordedAfterStart: timeDifferenceMinutes >= 0,
        },
      };
    });

    return recordsWithTimeAnalysis;
  }

  // 센터 목록 조회 (필터링용)
  async getFitnessCenters() {
    return await prisma.fitnessCenter.findMany({
      select: {
        id: true,
        title: true,
        address: true,
      },
      orderBy: {
        title: "asc",
      },
    });
  }
}

// ===== 타입 추론을 위한 타입 정의 =====
export type ITrainersWithStats = Awaited<
  ReturnType<
    InstanceType<typeof TrainerManagementService>["getTrainersWithStats"]
  >
>;
export type ITrainerWithStats = ITrainersWithStats[number]["trainers"][number];
export type ITrainerDetail = Awaited<
  ReturnType<InstanceType<typeof TrainerManagementService>["getTrainerDetail"]>
>;
export type ITrainerPtList = Awaited<
  ReturnType<InstanceType<typeof TrainerManagementService>["getTrainerPtList"]>
>;
export type ITrainerPtItem = ITrainerPtList[number];
export type IPtRecordDetails = Awaited<
  ReturnType<
    InstanceType<typeof TrainerManagementService>["getPtRecordDetails"]
  >
>;
export type IPtRecordDetail = IPtRecordDetails[number];
export type IFitnessCenterList = Awaited<
  ReturnType<InstanceType<typeof TrainerManagementService>["getFitnessCenters"]>
>;
