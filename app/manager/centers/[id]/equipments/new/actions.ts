// app/manager/centers/[id]/equipments/new/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { EquipmentCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeUnit } from "@/app/lib/utils/equipment.utils";

// 센터 정보 조회 (권한 확인용)
export const getCenterInfo = async (centerId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  return center;
};

// 장비 생성
export const createEquipment = async (centerId: string, formData: FormData) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 센터 존재 확인
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: { id: true },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // 폼 데이터 추출
  const title = formData.get("title") as string;
  const category = formData.get("category") as EquipmentCategory;
  const primaryValue = formData.get("primaryValue") as string;
  const primaryUnit = formData.get("primaryUnit") as string;
  const secondaryValue = formData.get("secondaryValue") as string;
  const secondaryUnit = formData.get("secondaryUnit") as string;
  const brand = formData.get("brand") as string;
  const model = formData.get("model") as string;
  const description = formData.get("description") as string;
  const quantity = formData.get("quantity") as string;
  const location = formData.get("location") as string;

  // 유효성 검사
  if (!title?.trim()) {
    throw new Error("장비 이름을 입력해주세요.");
  }

  if (!category) {
    throw new Error("카테고리를 선택해주세요.");
  }

  try {
    // 장비 생성
    const equipment = await prisma.equipment.create({
      data: {
        title: title.trim(),
        category,
        primaryValue: primaryValue ? parseFloat(primaryValue) : null,
        primaryUnit: normalizeUnit(primaryUnit),
        secondaryValue: secondaryValue ? parseFloat(secondaryValue) : null,
        secondaryUnit: normalizeUnit(secondaryUnit),
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        description: description?.trim() || null,
        quantity: quantity ? parseInt(quantity) : 1,
        location: location?.trim() || null,
        fitnessCenterId: centerId,
      },
      select: {
        id: true,
      },
    });

    // 캐시 재검증
    revalidatePath(`/manager/centers/${centerId}/equipments`);

    return {
      success: true,
      message: "장비가 성공적으로 등록되었습니다.",
      equipmentId: equipment.id,
    };
  } catch (error) {
    console.error("장비 생성 오류:", error);
    throw new Error("장비 생성 중 오류가 발생했습니다.");
  }
};
