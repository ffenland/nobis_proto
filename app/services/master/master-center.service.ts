import prisma from "@/app/lib/prisma";
import { validateMasterAccess } from "./product.service";
import { getKSTMonthStart, getKSTMonthEnd } from "@/app/lib/utils/time.utils";

// 모든 센터의 구체적인 정보 조회
export const getAllCentersDetail = async (masterId: string) => {
  await validateMasterAccess(masterId);

  // 이번 달 시작/종료 시간 계산 (KST 기준)
  const monthStart = getKSTMonthStart();
  const monthEnd = getKSTMonthEnd();

  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      inOperation: true,
      openingHours: {
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
      },
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              realname: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
          pt: {
            where: {
              state: {
                in: ["CONFIRMED", "ACCEPTING", "PAUSED"],
              },
            },
            select: {
              id: true,
            },
          },
        },
      },
      machines: {
        select: {
          id: true,
        },
      },
      lessons: {
        where: {
          scheduledAt: {
            gte: monthStart,
            lt: monthEnd,
          },
          isCanceled: false,
        },
        select: {
          id: true,
          records: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
          pt: {
            select: {
              payment: {
                select: {
                  amount: true,
                },
              },
              ptProduct: {
                select: {
                  totalCount: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  // 센터별 통계 계산
  const centersWithStats = centers.map((center) => {
    // 완료된 레슨: records가 있는 레슨
    const completedLessons = center.lessons.filter(
      (lesson) => lesson.records.length > 0
    );
    // 불참 레슨: records가 없는 레슨
    const absentLessons = center.lessons.filter(
      (lesson) => lesson.records.length === 0
    );

    const completedCount = completedLessons.length;
    const absentCount = absentLessons.length;

    // 이번달 레슨 수익 계산 (완료된 레슨만)
    const monthlyRevenue = completedLessons.reduce((sum: number, lesson) => {
      const amount = lesson.pt.payment?.amount || 0;
      const totalCount = lesson.pt.ptProduct.totalCount;
      const pricePerLesson = amount / totalCount;
      return sum + pricePerLesson;
    }, 0);

    // 센터의 모든 트레이너의 PT 합계
    const activePtCount = center.trainers.reduce(
      (sum, trainer) => sum + trainer.pt.length,
      0
    );

    // 영업시간 정렬 (월요일~일요일)
    const weekDayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const sortedOpeningHours = center.openingHours.sort((a, b) => {
      return weekDayOrder.indexOf(a.dayOfWeek) - weekDayOrder.indexOf(b.dayOfWeek);
    });

    return {
      id: center.id,
      title: center.title,
      inOperation: center.inOperation,
      openingHours: sortedOpeningHours,
      trainers: center.trainers.map((trainer) => ({
        id: trainer.id,
        realname: trainer.user.realname,
        avatarCloudflareId: trainer.user.avatarImage?.cloudflareId || null,
      })),
      activePtCount,
      machineCount: center.machines.length,
      monthlyStats: {
        completedLessons: completedCount,
        absentLessons: absentCount,
        revenue: Math.round(monthlyRevenue),
      },
    };
  });

  return centersWithStats;
};

export const getMasterFitnessCenterInfo = async ({
  centerId,
  masterId,
}: {
  centerId: string;
  masterId: string;
}) => {
  // Master 권한 검증
  await validateMasterAccess(masterId);

  // 센터 정보 조회
  const center = await prisma.fitnessCenter.findUnique({
    where: {
      id: centerId,
    },
    select: {
      id: true,
      title: true,
      address: true,
      addressDetail: true,
      postCode: true,
      phone: true,
      description: true,
      inOperation: true,
      images: {
        select: {
          id: true,
          cloudflareId: true,
          isPrimary: true,
        },
      },
      openingHours: {
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
      },
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              realname: true,
              username: true,
            },
          },
        },
      },
      managers: {
        select: {
          id: true,
          user: {
            select: {
              realname: true,
              username: true,
            },
          },
        },
      },
      offDays: {
        select: {
          id: true,
          date: true,
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // 영업시간 정렬 (월요일~일요일)
  const weekDayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const sortedOpeningHours = center.openingHours.sort((a, b) => {
    return (
      weekDayOrder.indexOf(a.dayOfWeek) - weekDayOrder.indexOf(b.dayOfWeek)
    );
  });

  return {
    ...center,
    openingHours: sortedOpeningHours,
    offDays: center.offDays.map((day) => ({
      ...day,
      date: day.date.toISOString(),
    })),
  };
};

// 센터 정보 수정
export const editMasterFitnessCenterInfo = async ({
  centerId,
  masterId,
  address,
  addressDetail,
  postCode,
  phone,
  description,
  openingHours,
}: {
  centerId: string;
  masterId: string;
  address?: string;
  addressDetail?: string;
  postCode?: string;
  phone?: string;
  description?: string;
  openingHours?: Array<{
    dayOfWeek: string;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }>;
}) => {
  // Master 권한 검증
  await validateMasterAccess(masterId);

  // 센터 존재 확인
  const existingCenter = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      openingHours: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingCenter) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // OpeningHours 처리: 기존 연결 해제 후 새로운 시간 연결
  let openingHoursConnect: { id: string }[] = [];

  if (openingHours) {
    // 각 영업시간에 대해 upsert (존재하면 가져오고, 없으면 생성)
    const openingHourIds = await Promise.all(
      openingHours.map(async (hour) => {
        const existingHour = await prisma.openingHour.findFirst({
          where: {
            dayOfWeek: hour.dayOfWeek as any,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          },
        });

        if (existingHour) {
          return existingHour.id;
        }

        // 없으면 생성
        const newHour = await prisma.openingHour.create({
          data: {
            dayOfWeek: hour.dayOfWeek as any,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          },
        });

        return newHour.id;
      })
    );

    openingHoursConnect = openingHourIds.map((id) => ({ id }));
  }

  // 센터 업데이트
  const updateData: any = {};

  if (address !== undefined) updateData.address = address;
  if (addressDetail !== undefined) updateData.addressDetail = addressDetail;
  if (postCode !== undefined) updateData.postCode = postCode;
  if (phone !== undefined) updateData.phone = phone;
  if (description !== undefined) updateData.description = description;

  // OpeningHours 업데이트
  if (openingHours) {
    updateData.openingHours = {
      set: [], // 기존 연결 모두 해제
      connect: openingHoursConnect,
    };
  }

  const updatedCenter = await prisma.fitnessCenter.update({
    where: { id: centerId },
    data: updateData,
    select: {
      id: true,
      title: true,
      address: true,
      addressDetail: true,
      postCode: true,
      phone: true,
      description: true,
    },
  });

  return updatedCenter;
};

// 타입 추론
export type IAllCenterDetail = Awaited<ReturnType<typeof getAllCentersDetail>>;
export type GetMasterFitnessCenterInfoResult = Awaited<
  ReturnType<typeof getMasterFitnessCenterInfo>
>;
