// app/manager/centers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WeekDay } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";

// 타입 정의
export interface IServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface ICenterFormData {
  title: string;
  address: string;
  phone: string;
  description: string;
  // 영업시간
  MON_open: string;
  MON_close: string;
  TUE_open: string;
  TUE_close: string;
  WED_open: string;
  WED_close: string;
  THU_open: string;
  THU_close: string;
  FRI_open: string;
  FRI_close: string;
  SAT_open: string;
  SAT_close: string;
  SUN_open: string;
  SUN_close: string;
}

// 데이터 조회 함수들
export async function getCentersData() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    throw new Error("권한이 없습니다.");
  }

  return await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
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
              username: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          machines: true,
          equipments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCenterData(centerId: string) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    throw new Error("권한이 없습니다.");
  }

  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
      openingHours: {
        select: {
          id: true,
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
              id: true,
              username: true,
              email: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
      },
      managers: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
      members: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      machines: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          members: true,
          machines: true,
          trainers: true,
          equipments: true,
        },
      },
    },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  return center;
}

export async function getCenterStatsData(centerId: string) {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") {
    throw new Error("권한이 없습니다.");
  }

  const stats = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      _count: {
        select: {
          members: true,
          trainers: true,
          machines: true,
          equipments: true,
        },
      },
    },
  });

  return stats?._count || { members: 0, trainers: 0, machines: 0, equipments: 0 };
}

// 입력 검증 함수
function validateCenterForm(formData: FormData): {
  isValid: boolean;
  data?: {
    title: string;
    address: string;
    phone: string;
    description: string;
    openingHours: {
      dayOfWeek: WeekDay;
      openTime: number;
      closeTime: number;
      isClosed: boolean;
    }[];
  };
  errors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const title = formData.get("title") as string;
  const address = formData.get("address") as string;
  const phone = formData.get("phone") as string;
  const description = formData.get("description") as string;

  // 필수 필드 검증
  if (!title?.trim()) {
    errors.title = "센터명을 입력해주세요.";
  }
  if (!address?.trim()) {
    errors.address = "주소를 입력해주세요.";
  }
  if (!phone?.trim()) {
    errors.phone = "전화번호를 입력해주세요.";
  } else if (!/^[0-9-]+$/.test(phone)) {
    errors.phone = "올바른 전화번호 형식이 아닙니다.";
  }

  // 영업시간 검증 및 변환
  const weekDays: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const openingHours: {
    dayOfWeek: WeekDay;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }[] = [];

  for (const day of weekDays) {
    const isClosed = formData.get(`${day}_closed`) === "on";

    if (isClosed) {
      // 휴무일인 경우
      openingHours.push({
        dayOfWeek: day,
        openTime: 0,
        closeTime: 0,
        isClosed: true,
      });
    } else {
      // 영업일인 경우
      const openTime = parseInt(formData.get(`${day}_open`) as string);
      const closeTime = parseInt(formData.get(`${day}_close`) as string);

      if (isNaN(openTime) || isNaN(closeTime)) {
        errors[`${day}_time`] = `${day} 영업시간을 올바르게 입력해주세요.`;
        continue;
      }

      if (openTime >= closeTime) {
        errors[`${day}_time`] = `${day} 마감시간이 시작시간보다 늦어야 합니다.`;
        continue;
      }

      openingHours.push({
        dayOfWeek: day,
        openTime,
        closeTime,
        isClosed: false,
      });
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      title: title.trim(),
      address: address.trim(),
      phone: phone.trim(),
      description: description?.trim() || "",
      openingHours,
    },
  };
}

// 센터 생성 함수
async function createCenter(data: {
  title: string;
  address: string;
  phone: string;
  description: string;
  openingHours: {
    dayOfWeek: WeekDay;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }[];
}) {
  return await prisma.$transaction(async (tx) => {
    // 센터 생성
    const center = await tx.fitnessCenter.create({
      data: {
        title: data.title,
        address: data.address,
        phone: data.phone,
        description: data.description,
      },
      select: {
        id: true,
        title: true,
      },
    });

    // 영업시간 생성
    if (data.openingHours.length > 0) {
      await tx.openingHour.createMany({
        data: data.openingHours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isClosed: hour.isClosed,
        })),
      });

      // 센터와 영업시간 연결
      const createdHours = await tx.openingHour.findMany({
        where: {
          OR: data.openingHours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          })),
        },
        select: { id: true },
      });

      await tx.fitnessCenter.update({
        where: { id: center.id },
        data: {
          openingHours: {
            connect: createdHours.map((hour) => ({ id: hour.id })),
          },
        },
      });
    }

    return center;
  });
}

// 센터 수정 함수
async function updateCenter(
  centerId: string,
  data: {
    title?: string;
    address?: string;
    phone?: string;
    description?: string;
    openingHours?: {
      dayOfWeek: WeekDay;
      openTime: number;
      closeTime: number;
      isClosed: boolean;
    }[];
  }
) {
  return await prisma.$transaction(async (tx) => {
    interface IUpdateData {
      title?: string;
      address?: string;
      phone?: string;
      description?: string;
    }

    const updateData: IUpdateData = {};

    // 기본 정보 업데이트
    if (data.title !== undefined) updateData.title = data.title;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.description !== undefined)
      updateData.description = data.description;

    // 센터 기본 정보 업데이트
    const updatedCenter = await tx.fitnessCenter.update({
      where: { id: centerId },
      data: updateData,
      select: {
        id: true,
        title: true,
      },
    });

    // 영업시간 업데이트
    if (data.openingHours && data.openingHours.length > 0) {
      // 기존 영업시간 연결 해제
      await tx.fitnessCenter.update({
        where: { id: centerId },
        data: {
          openingHours: {
            set: [],
          },
        },
      });

      // 새로운 영업시간 생성 또는 기존 것 사용
      const openingHourIds = await Promise.all(
        data.openingHours.map(async (hour) => {
          const existingHour = await tx.openingHour.findFirst({
            where: {
              dayOfWeek: hour.dayOfWeek,
              openTime: hour.openTime,
              closeTime: hour.closeTime,
              isClosed: hour.isClosed,
            },
            select: { id: true },
          });

          if (existingHour) {
            return existingHour.id;
          }

          const newHour = await tx.openingHour.create({
            data: {
              dayOfWeek: hour.dayOfWeek,
              openTime: hour.openTime,
              closeTime: hour.closeTime,
              isClosed: hour.isClosed,
            },
            select: { id: true },
          });

          return newHour.id;
        })
      );

      // 새로운 영업시간 연결
      await tx.fitnessCenter.update({
        where: { id: centerId },
        data: {
          openingHours: {
            connect: openingHourIds.map((id) => ({ id })),
          },
        },
      });
    }

    return updatedCenter;
  });
}

// 서버 액션들
export async function createCenterAction(
  _prevState: IServerActionResponse,
  formData: FormData
): Promise<IServerActionResponse> {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return {
        success: false,
        error: "권한이 없습니다.",
      };
    }

    // 입력 검증
    const validation = validateCenterForm(formData);
    if (!validation.isValid) {
      return {
        success: false,
        error: "입력 정보를 확인해주세요.",
        fieldErrors: validation.errors,
      };
    }

    // 센터 생성
    const center = await createCenter(validation.data!);

    // 캐시 무효화
    revalidatePath("/manager/centers");

    return {
      success: true,
      data: center,
    };
  } catch (error) {
    console.error("센터 생성 오류:", error);
    return {
      success: false,
      error: "센터 생성 중 오류가 발생했습니다.",
    };
  }
}

export async function updateCenterAction(
  centerId: string,
  _prevState: IServerActionResponse,
  formData: FormData
): Promise<IServerActionResponse> {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return {
        success: false,
        error: "권한이 없습니다.",
      };
    }

    // 입력 검증
    const validation = validateCenterForm(formData);
    if (!validation.isValid) {
      return {
        success: false,
        error: "입력 정보를 확인해주세요.",
        fieldErrors: validation.errors,
      };
    }

    // 센터 수정
    const center = await updateCenter(centerId, validation.data!);

    // 캐시 무효화
    revalidatePath("/manager/centers");
    revalidatePath(`/manager/centers/${centerId}`);

    return {
      success: true,
      data: center,
    };
  } catch (error) {
    console.error("센터 수정 오류:", error);
    return {
      success: false,
      error: "센터 수정 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteCenterAction(
  centerId: string
): Promise<IServerActionResponse> {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return {
        success: false,
        error: "권한이 없습니다.",
      };
    }

    // 센터 삭제
    await prisma.fitnessCenter.delete({
      where: { id: centerId },
      select: {
        id: true,
        title: true,
      },
    });

    // 캐시 무효화 및 리다이렉트
    revalidatePath("/manager/centers");
    redirect("/manager/centers");
  } catch (error) {
    console.error("센터 삭제 오류:", error);
    return {
      success: false,
      error: "센터 삭제 중 오류가 발생했습니다.",
    };
  }
}

// 타입 추출을 위한 더미 함수들 (실제로는 호출되지 않음)
// These variables are only used for type extraction
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getCentersData = getCentersData; // Type utility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getCenterData = getCenterData; // Type utility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getCenterStatsData = getCenterStatsData; // Type utility

export type ICenterSummary = Awaited<
  ReturnType<typeof _getCentersData>
>[number];
export type ICenterDetail = Awaited<ReturnType<typeof _getCenterData>>;
export type ICenterStats = Awaited<ReturnType<typeof _getCenterStatsData>>;
