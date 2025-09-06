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
export type GetFreeExercisesResult = Awaited<ReturnType<typeof getFreeExercises>>;

// 배열 요소 타입
export type FreeExercise = GetFreeExercisesResult[number];

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
export type GetStretchingExercisesResult = Awaited<ReturnType<typeof getStretchingExercises>>;

// 배열 요소 타입
export type StretchingExercise = GetStretchingExercisesResult[number];