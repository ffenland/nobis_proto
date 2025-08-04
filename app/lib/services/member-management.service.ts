// app/lib/services/member-management.service.ts

import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// ===== 입력 타입 정의 =====
export interface IMemberListFilters {
  centerId?: string;
  search?: string;
  hasPt?: boolean;
}

export interface IMemberDetailParams {
  memberId: string;
}

// ===== 서비스 클래스 =====
export class MemberManagementService {
  private static instance: MemberManagementService;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MemberManagementService();
    }
    return this.instance;
  }

  // 회원 목록 및 통계 조회 (센터별 그룹화)
  async getMembersWithStats(filters: IMemberListFilters = {}) {
    const { centerId, search, hasPt } = filters;

    // 기본 조건
    const where = {
      active: true,
      ...(centerId && { fitnessCenterId: centerId }),
      ...(search && {
        user: {
          username: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      }),
      ...(hasPt !== undefined && {
        pt: hasPt ? { some: { state: PtState.CONFIRMED } } : { none: {} },
      }),
    };

    // 회원 목록 조회
    const members = await prisma.member.findMany({
      where,
      select: {
        id: true,
        active: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            mobile: true,
            createdAt: true,
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
        // PT 정보
        pt: {
          where: { state: PtState.CONFIRMED },
          select: {
            id: true,
            state: true,
            createdAt: true,
            startDate: true,
            ptProduct: {
              select: {
                id: true,
                title: true,
                totalCount: true,
              },
            },
            trainer: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
            ptRecord: {
              select: {
                id: true,
                createdAt: true,
              },
            },
          },
        },
        // 멤버십 정보
        membership: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            startedAt: true,
            closedAt: true,
            membershipProduct: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 회원별 통계 계산
    const membersWithStats = members.map((member) => {
      const activePts = member.pt.filter(
        (pt) => pt.state === PtState.CONFIRMED
      );
      const activeMembership = member.membership[0] || null;

      // PT 통계 계산
      const ptStats = activePts.reduce(
        (
          acc: {
            totalActivePt: number;
            totalCompletedSessions: number;
            totalScheduledSessions: number;
          },
          pt
        ) => {
          const completedSessions = pt.ptRecord.length; // PtRecord 존재 = 완료된 세션
          const totalSessions = pt.ptProduct.totalCount;

          acc.totalActivePt += 1;
          acc.totalCompletedSessions += completedSessions;
          acc.totalScheduledSessions += totalSessions;

          return acc;
        },
        {
          totalActivePt: 0,
          totalCompletedSessions: 0,
          totalScheduledSessions: 0,
        }
      );

      const ptUtilizationRate =
        ptStats.totalScheduledSessions > 0
          ? (ptStats.totalCompletedSessions / ptStats.totalScheduledSessions) *
            100
          : 0;

      return {
        ...member,
        stats: {
          activePtCount: ptStats.totalActivePt,
          totalCompletedSessions: ptStats.totalCompletedSessions,
          totalScheduledSessions: ptStats.totalScheduledSessions,
          ptUtilizationRate: Math.round(ptUtilizationRate * 10) / 10, // 소수점 1자리
          hasActiveMembership: !!activeMembership,
          membershipTitle: activeMembership?.membershipProduct.title || null,
        },
      };
    });

    // 센터별로 그룹화
    const groupedByCenter = membersWithStats.reduce((acc, member) => {
      const centerId = member.fitnessCenter?.id || "no-center";
      const centerTitle = member.fitnessCenter?.title || "센터 미배정";

      if (!acc[centerId]) {
        acc[centerId] = {
          id: centerId,
          title: centerTitle,
          address: member.fitnessCenter?.address || "",
          members: [],
          stats: {
            totalMembers: 0,
            membersWithPt: 0,
            membersWithMembership: 0,
            ptUtilizationRate: 0,
          },
        };
      }

      acc[centerId].members.push(member);
      acc[centerId].stats.totalMembers += 1;
      if (member.stats.activePtCount > 0) {
        acc[centerId].stats.membersWithPt += 1;
      }
      if (member.stats.hasActiveMembership) {
        acc[centerId].stats.membersWithMembership += 1;
      }

      return acc;
    }, {} as Record<string, { id: string; title: string; address: string; members: typeof membersWithStats; stats: { totalMembers: number; membersWithPt: number; membersWithMembership: number; ptUtilizationRate: number } }>);

    // 센터별 PT 이용률 계산
    Object.values(groupedByCenter).forEach((center) => {
      const totalMembers = center.stats.totalMembers;
      const membersWithPt = center.stats.membersWithPt;
      center.stats.ptUtilizationRate =
        totalMembers > 0
          ? Math.round((membersWithPt / totalMembers) * 100 * 10) / 10
          : 0;
    });

    return Object.values(groupedByCenter);
  }

  // 특정 회원 상세 정보 조회
  async getMemberDetail(params: IMemberDetailParams) {
    const { memberId } = params;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        active: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            mobile: true,
            createdAt: true,
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
        // 현재 활성화된 PT 정보
        pt: {
          where: { state: PtState.CONFIRMED },
          select: {
            id: true,
            state: true,
            createdAt: true,
            startDate: true,
            description: true,
            ptProduct: {
              select: {
                id: true,
                title: true,
                price: true,
                totalCount: true,
                time: true,
              },
            },
            trainer: {
              select: {
                id: true,
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
              },
            },
            ptRecord: {
              select: {
                id: true,
                createdAt: true,
                memo: true,
                ptSchedule: {
                  select: {
                    id: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        // 현재 활성화된 멤버십 정보
        membership: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            startedAt: true,
            closedAt: true,
            membershipProduct: {
              select: {
                id: true,
                title: true,
                price: true,
                totalCount: true,
              },
            },
          },
          orderBy: {
            startedAt: "desc",
          },
        },
        // 쿠폰 정보
        ptCoupon: {
          where: {
            onValid: true,
          },
          select: {
            id: true,
            discount: true,
            maxPrice: true,
            openedAt: true,
            closedAt: true,
          },
        },
        membershipCoupon: {
          where: {
            onValid: true,
          },
          select: {
            id: true,
            discount: true,
            maxPrice: true,
            openedAt: true,
            closedAt: true,
          },
        },
      },
    });

    if (!member) {
      throw new Error("회원을 찾을 수 없습니다.");
    }

    // PT 통계 계산
    const ptStats = member.pt.reduce(
      (
        acc: {
          totalActivePt: number;
          totalCompletedSessions: number;
          totalScheduledSessions: number;
          totalRemainingSessions: number;
        },
        pt
      ) => {
        const completedSessions = pt.ptRecord.length;
        const totalSessions = pt.ptProduct.totalCount;
        const remainingSessions = totalSessions - completedSessions;

        acc.totalActivePt += 1;
        acc.totalCompletedSessions += completedSessions;
        acc.totalScheduledSessions += totalSessions;
        acc.totalRemainingSessions += remainingSessions;

        return acc;
      },
      {
        totalActivePt: 0,
        totalCompletedSessions: 0,
        totalScheduledSessions: 0,
        totalRemainingSessions: 0,
      }
    );

    const ptUtilizationRate =
      ptStats.totalScheduledSessions > 0
        ? (ptStats.totalCompletedSessions / ptStats.totalScheduledSessions) *
          100
        : 0;

    return {
      ...member,
      stats: {
        ...ptStats,
        ptUtilizationRate: Math.round(ptUtilizationRate * 10) / 10, // 소수점 1자리
      },
    };
  }

  // 회원별 PT 기록 조회
  async getMemberPtRecords(memberId: string, ptId?: string) {
    const where = {
      pt: {
        memberId,
        ...(ptId && { id: ptId }),
        state: PtState.CONFIRMED,
      },
    };

    const records = await prisma.ptRecord.findMany({
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
        items: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            entry: true,
            // 머신 운동 기록
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
            // 프리 웨이트 기록
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
            // 스트레칭 기록
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return records;
  }
}

// ===== 타입 추론 =====
export type IMembersWithStats = Awaited<
  ReturnType<InstanceType<typeof MemberManagementService>['getMembersWithStats']>
>;

export type IMemberDetail = Awaited<
  ReturnType<InstanceType<typeof MemberManagementService>['getMemberDetail']>
>;

export type IMemberPtRecords = Awaited<
  ReturnType<InstanceType<typeof MemberManagementService>['getMemberPtRecords']>
>;

// Fitness Center 목록을 위한 타입 (기존 trainer-management.service에서 import)
export type IFitnessCenterList = Array<{
  id: string;
  title: string;
  address: string;
}>;
