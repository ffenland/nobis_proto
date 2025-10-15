import prisma from "@/app/lib/prisma";

export const getExerciseListForManager = async () => {
  const [free, stretching] = await Promise.all([
    prisma.freeExercise.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            freeSetRecords: true,
          },
        },
      },
    }),
    prisma.stretchingExercise.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            stretchingExerciseRecord: true,
          },
        },
      },
    }),
  ]);

  return { free, stretching };
};

export type IManagerFreeExerciseList = Awaited<
  ReturnType<typeof getExerciseListForManager>
>["free"];
export type IManagerStretchingExerciseList = Awaited<
  ReturnType<typeof getExerciseListForManager>
>["stretching"];

// FreeExercise 생성
export const createFreeExercise = async (data: {
  title: string;
  description?: string;
}) => {
  return await prisma.freeExercise.create({
    data,
    select: { id: true, title: true },
  });
};

// StretchingExercise 생성
export const createStretchingExercise = async (data: {
  title: string;
  description: string;
}) => {
  return await prisma.stretchingExercise.create({
    data,
    select: { id: true, title: true },
  });
};
