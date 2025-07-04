// app/manager/centers/[id]/facilities/weights/actions.ts
"use server";

import prisma from "@/app/lib/prisma";

// Weights 조회 함수의 반환 타입 (타입 추론 사용)
export type WeightsListItem = Awaited<
  ReturnType<typeof getCenterWeights>
>[number];

/**
 * 특정 센터의 Weights 목록을 조회합니다.
 * @param fitnessCenterId - 피트니스 센터 ID
 * @returns Weights 목록
 */
export async function getCenterWeights(fitnessCenterId: string) {
  try {
    const weights = await prisma.weights.findMany({
      where: {
        fitnessCenterId: fitnessCenterId,
      },
      select: {
        id: true,
        title: true,
        unit: true,
        weight: true,
        description: true,
        fitnessCenterId: true,
      },
      orderBy: [
        { weight: "asc" }, // 무게순으로 정렬
        { title: "asc" }, // 같은 무게면 이름순
      ],
    });

    return weights;
  } catch (error) {
    console.error("Error fetching center weights:", error);
    throw new Error("Failed to fetch weights data");
  }
}

/**
 * 센터 정보를 조회합니다 (권한 확인용)
 * @param fitnessCenterId - 피트니스 센터 ID
 * @returns 센터 정보
 */
export async function getCenterInfo(fitnessCenterId: string) {
  try {
    const center = await prisma.fitnessCenter.findUnique({
      where: {
        id: fitnessCenterId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!center) {
      throw new Error("센터를 찾을 수 없습니다.");
    }

    return center;
  } catch (error) {
    console.error("Error fetching center info:", error);
    throw new Error("Failed to fetch center information");
  }
}
