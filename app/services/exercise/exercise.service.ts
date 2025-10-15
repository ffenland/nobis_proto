import prisma from "@/app/lib/prisma";

// === Free Exercise 관련 서비스 ===

// 프리웨이트 운동 목록 조회
export async function getFreeExercises() {
  const exercises = await prisma.freeExercise.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return exercises;
}

// 타입 추론
export type GetFreeExercisesResult = Awaited<
  ReturnType<typeof getFreeExercises>
>;

// 배열 요소 타입
export type FreeExercise = GetFreeExercisesResult[number];

// 프리웨이트 운동 상세 조회
export async function getFreeExerciseDetail(id: string) {
  const exercise = await prisma.freeExercise.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          freeSetRecords: true,
        },
      },
      images: {
        select: {
          id: true,
          cloudflareId: true,
          isPrimary: true,
        },
        orderBy: [
          { isPrimary: "desc" }, // 대표 이미지 먼저
          { createdAt: "asc" },
        ],
      },
      videos: {
        select: {
          id: true,
          streamId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return exercise;
}

// 타입 추론
export type GetFreeExerciseDetailResult = Awaited<
  ReturnType<typeof getFreeExerciseDetail>
>;

// === Stretching Exercise 관련 서비스 ===

// 스트레칭 운동 목록 조회
export async function getStretchingExercises() {
  const exercises = await prisma.stretchingExercise.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return exercises;
}

// 타입 추론
export type GetStretchingExercisesResult = Awaited<
  ReturnType<typeof getStretchingExercises>
>;

// 배열 요소 타입
export type StretchingExercise = GetStretchingExercisesResult[number];

// 스트레칭 운동 상세 조회
export async function getStretchingExerciseDetail(id: string) {
  const exercise = await prisma.stretchingExercise.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          stretchingExerciseRecord: true,
        },
      },
      images: {
        select: {
          id: true,
          cloudflareId: true,
          isPrimary: true,
        },
        orderBy: [
          { isPrimary: "desc" }, // 대표 이미지 먼저
          { createdAt: "asc" },
        ],
      },
      videos: {
        select: {
          id: true,
          streamId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return exercise;
}

// 타입 추론
export type GetStretchingExerciseDetailResult = Awaited<
  ReturnType<typeof getStretchingExerciseDetail>
>;

// === Exercise Update 관련 서비스 ===

// 프리웨이트 운동 설명 업데이트
export async function updateFreeExerciseDescription(
  id: string,
  description: string
) {
  const exercise = await prisma.freeExercise.update({
    where: { id },
    data: { description },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  return exercise;
}

// 스트레칭 운동 설명 업데이트
export async function updateStretchingExerciseDescription(
  id: string,
  description: string
) {
  const exercise = await prisma.stretchingExercise.update({
    where: { id },
    data: { description },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  return exercise;
}
