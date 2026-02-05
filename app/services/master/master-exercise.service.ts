import prisma from "@/app/lib/prisma";
import { validateMasterAccess } from "./product.service";

export const getExerciseListForMaster = async () => {
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

export type IMasterFreeExerciseList = Awaited<
  ReturnType<typeof getExerciseListForMaster>
>["free"];
export type IMasterStretchingExerciseList = Awaited<
  ReturnType<typeof getExerciseListForMaster>
>["stretching"];

// FreeExercise 생성
export const createFreeExercise = async (data: {
  title: string;
  description?: string;
  masterId: string;
}) => {
  await validateMasterAccess(data.masterId);

  return await prisma.freeExercise.create({
    data: {
      title: data.title,
      ...(data.description && { description: data.description }),
    },
    select: { id: true, title: true },
  });
};

// StretchingExercise 생성
export const createStretchingExercise = async (data: {
  title: string;
  description: string;
  masterId: string;
}) => {
  await validateMasterAccess(data.masterId);
  return await prisma.stretchingExercise.create({
    data: {
      title: data.title,
      description: data.description,
    },
    select: { id: true, title: true },
  });
};
