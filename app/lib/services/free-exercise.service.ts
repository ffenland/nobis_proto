// app/lib/services/free-exercise.service.ts
"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

// FreeExercise 목록 조회 타입
export type FreeExerciseList = Prisma.PromiseReturnType<
  typeof getFreeExercises
>;


// FreeExercise 생성 타입
export type FreeExerciseCreateData = {
  title: string;
  description?: string;
};

// FreeExercise 목록 조회
export const getFreeExercises = async () => {
  return await prisma.freeExercise.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          freeSetRecords: true,
          images: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
};


// FreeExercise 생성
export const createFreeExercise = async (data: FreeExerciseCreateData) => {
  return await prisma.freeExercise.create({
    data: {
      title: data.title,
      description: data.description,
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
    },
  });
};
