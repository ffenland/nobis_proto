"use server";

import { revalidatePath } from "next/cache";
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
  addressDetail: string;
  postCode: string;
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

// 입력 검증 함수
function validateCenterForm(formData: FormData): {
  isValid: boolean;
  data?: {
    title: string;
    address: string;
    addressDetail: string;
    postCode: string;
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
  const addressDetail = formData.get("addressDetail") as string;
  const postCode = formData.get("postCode") as string;
  const phone = formData.get("phone") as string;
  const description = formData.get("description") as string;

  // 필수 필드 검증
  if (!title?.trim()) {
    errors.title = "센터명을 입력해주세요.";
  }
  if (!address?.trim()) {
    errors.address = "주소를 입력해주세요.";
  }
  if (!postCode?.trim()) {
    errors.postCode = "우편번호를 입력해주세요. 주소 검색을 사용해주세요.";
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
  const processedDays = new Set<WeekDay>();

  for (const day of weekDays) {
    const isClosed = formData.get(`${day}_closed`) === "on";
    let hasError = false;

    if (isClosed) {
      // 휴무일인 경우
      openingHours.push({
        dayOfWeek: day,
        openTime: 0,
        closeTime: 0,
        isClosed: true,
      });
      processedDays.add(day);
    } else {
      // 영업일인 경우
      const openTime = parseInt(formData.get(`${day}_open`) as string);
      const closeTime = parseInt(formData.get(`${day}_close`) as string);

      if (isNaN(openTime) || isNaN(closeTime)) {
        errors[`${day}_time`] = `${day} 영업시간을 올바르게 입력해주세요.`;
        hasError = true;
      } else {
        // 시간 범위 검증 (0-2400)
        if (openTime < 0 || openTime > 2400) {
          errors[`${day}_time`] = `${day} 시작 시간은 0-2400 사이여야 합니다.`;
          hasError = true;
        } else if (closeTime < 0 || closeTime > 2400) {
          errors[`${day}_time`] = `${day} 종료 시간은 0-2400 사이여야 합니다.`;
          hasError = true;
        } else if (openTime >= closeTime) {
          errors[
            `${day}_time`
          ] = `${day} 마감시간이 시작시간보다 늦어야 합니다.`;
          hasError = true;
        }
      }

      // 에러가 없을 때만 추가
      if (!hasError) {
        openingHours.push({
          dayOfWeek: day,
          openTime,
          closeTime,
          isClosed: false,
        });
        processedDays.add(day);
      }
    }
  }

  // 모든 요일이 처리되었는지 확인
  if (processedDays.size !== 7) {
    const missingDays = weekDays.filter((day) => !processedDays.has(day));
    errors.openingHours = `다음 요일의 영업시간 정보가 누락되었습니다: ${missingDays.join(
      ", "
    )}`;
  }

  // openingHours 배열이 정확히 7개인지 추가 검증
  if (openingHours.length !== 7) {
    errors.openingHours = `모든 요일(7개)의 영업시간 정보가 필요합니다. 현재 ${openingHours.length}개만 입력되었습니다.`;
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      title: title.trim(),
      address: address.trim(),
      addressDetail: addressDetail?.trim() || "",
      postCode: postCode.trim(),
      phone: phone.trim(),
      description: description?.trim() || "",
      openingHours,
    },
  };
}

// OpeningHour를 찾거나 생성하는 헬퍼 함수
async function findOrCreateOpeningHours(
  openingHours: {
    dayOfWeek: WeekDay;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }[]
): Promise<string[]> {
  // 각 요일별로 중복 체크
  const dayOfWeekSet = new Set(openingHours.map((h) => h.dayOfWeek));
  if (dayOfWeekSet.size !== 7 || openingHours.length !== 7) {
    throw new Error("모든 요일(7개)에 대한 영업시간이 필요합니다.");
  }

  const openingHourIds: string[] = [];

  // 각 openingHour를 순회하면서 처리
  for (const hour of openingHours) {
    let existingHour;

    if (hour.isClosed) {
      // 휴무일인 경우: dayOfWeek와 isClosed만으로 조회
      existingHour = await prisma.openingHour.findFirst({
        where: {
          dayOfWeek: hour.dayOfWeek,
          isClosed: true,
        },
        select: { id: true },
      });
    } else {
      // 영업일인 경우: 4개 조건 모두로 조회
      existingHour = await prisma.openingHour.findFirst({
        where: {
          dayOfWeek: hour.dayOfWeek,
          isClosed: false,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
        },
        select: { id: true },
      });
    }

    if (existingHour) {
      // 기존 openingHour가 존재하면 해당 ID 사용
      openingHourIds.push(existingHour.id);
    } else {
      // 존재하지 않으면 새로 생성
      const newHour = await prisma.openingHour.create({
        data: {
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.isClosed ? 0 : hour.openTime,
          closeTime: hour.isClosed ? 0 : hour.closeTime,
          isClosed: hour.isClosed,
        },
        select: { id: true },
      });
      openingHourIds.push(newHour.id);
    }
  }

  return openingHourIds;
}

// 센터 생성 함수
async function createCenter(data: {
  title: string;
  address: string;
  addressDetail: string;
  postCode: string;
  phone: string;
  description: string;
  openingHours: {
    dayOfWeek: WeekDay;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }[];
}) {
  // 먼저 openingHour들을 찾거나 생성
  const openingHourIds = await findOrCreateOpeningHours(data.openingHours);

  // 트랜잭션 내에서 센터 생성 및 openingHour 연결
  return await prisma.$transaction(async (tx) => {
    // 센터 생성과 동시에 openingHours 연결
    const center = await tx.fitnessCenter.create({
      data: {
        title: data.title,
        address: data.address,
        addressDetail: data.addressDetail,
        postCode: data.postCode,
        phone: data.phone,
        description: data.description,
        openingHours: {
          connect: openingHourIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    return center;
  });
}

// 서버 액션
export async function createCenterAction(
  _prevState: IServerActionResponse,
  formData: FormData
): Promise<IServerActionResponse> {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || (session.role !== "MANAGER" && session.role !== "MASTER")) {
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
    revalidatePath("/master/settings");
    revalidatePath("/master/centers");
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
