// app/manager/centers/[id]/equipments/[equipmentId]/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { Prisma, EquipmentCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeUnit } from "@/app/lib/utils/equipment.utils";

export type IEquipmentDetail = Prisma.PromiseReturnType<
  typeof getEquipmentDetail
>;

// 특정 장비 상세 정보 조회
export const getEquipmentDetail = async (
  centerId: string,
  equipmentId: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 장비 정보 조회
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: {
      id: true,
      title: true,
      category: true,
      primaryValue: true,
      primaryUnit: true,
      secondaryValue: true,
      secondaryUnit: true,
      brand: true,
      model: true,
      description: true,
      quantity: true,
      location: true,
      fitnessCenterId: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      photos: {
        select: {
          id: true,
          publicUrl: true,
        },
      },
    },
  });

  if (!equipment) {
    throw new Error("장비를 찾을 수 없습니다.");
  }

  // 장비가 해당 센터에 속하는지 확인
  if (equipment.fitnessCenterId !== centerId) {
    throw new Error("해당 센터의 장비가 아닙니다.");
  }

  return equipment;
};

// 장비 정보 업데이트
export const updateEquipment = async (
  centerId: string,
  equipmentId: string,
  formData: FormData
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
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

  // 장비 존재 확인
  const existingEquipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, fitnessCenterId: true },
  });

  if (!existingEquipment) {
    throw new Error("장비를 찾을 수 없습니다.");
  }

  if (existingEquipment.fitnessCenterId !== centerId) {
    throw new Error("해당 센터의 장비가 아닙니다.");
  }

  try {
    // 장비 정보 업데이트
    await prisma.equipment.update({
      where: { id: equipmentId },
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
      },
    });

    // 캐시 재검증
    revalidatePath(`/manager/centers/${centerId}/equipments`);
    revalidatePath(`/manager/centers/${centerId}/equipments/${equipmentId}`);

    return { success: true, message: "장비 정보가 성공적으로 수정되었습니다." };
  } catch (error) {
    console.error("장비 수정 오류:", error);
    throw new Error("장비 수정 중 오류가 발생했습니다.");
  }
};

// 장비 삭제
export const deleteEquipment = async (
  centerId: string,
  equipmentId: string
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 장비 존재 확인
  const existingEquipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, fitnessCenterId: true, title: true },
  });

  if (!existingEquipment) {
    throw new Error("장비를 찾을 수 없습니다.");
  }

  if (existingEquipment.fitnessCenterId !== centerId) {
    throw new Error("해당 센터의 장비가 아닙니다.");
  }

  try {
    // 장비 삭제
    await prisma.equipment.delete({
      where: { id: equipmentId },
    });

    // 캐시 재검증
    revalidatePath(`/manager/centers/${centerId}/equipments`);

    return { success: true, message: "장비가 성공적으로 삭제되었습니다." };
  } catch (error) {
    console.error("장비 삭제 오류:", error);
    throw new Error("장비 삭제 중 오류가 발생했습니다.");
  }
};
