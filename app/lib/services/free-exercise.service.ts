// app/lib/services/free-exercise.service.ts
"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

// FreeExercise 목록 조회 타입
export type FreeExerciseList = Prisma.PromiseReturnType<typeof getFreeExercises>;

// FreeExercise 상세 조회 타입
export type FreeExerciseDetail = Prisma.PromiseReturnType<typeof getFreeExerciseById>;

// FreeExercise 생성 타입
export type FreeExerciseCreateData = {
  title: string;
  description?: string;
};

// FreeExercise 업데이트 타입
export type FreeExerciseUpdateData = {
  title?: string;
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
          photos: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
};

// FreeExercise 상세 조회
export const getFreeExerciseById = async (id: string) => {
  const freeExercise = await prisma.freeExercise.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      photos: {
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          type: true,
        },
      },
      _count: {
        select: {
          freeSetRecords: true,
        },
      },
    },
  });

  if (!freeExercise) {
    throw new Error("프리 운동을 찾을 수 없습니다.");
  }

  return freeExercise;
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

// FreeExercise 업데이트
export const updateFreeExercise = async (id: string, data: FreeExerciseUpdateData) => {
  return await prisma.freeExercise.update({
    where: { id },
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

// FreeExercise 삭제
export const deleteFreeExercise = async (id: string) => {
  // 관련 레코드가 있는지 확인
  const recordCount = await prisma.freeSetRecord.count({
    where: { freeExerciseId: id },
  });

  if (recordCount > 0) {
    throw new Error("이 운동을 사용하는 기록이 있어 삭제할 수 없습니다.");
  }

  return await prisma.freeExercise.delete({
    where: { id },
  });
};

// FreeExercise 검색
export const searchFreeExercises = async (query: string) => {
  return await prisma.freeExercise.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      _count: {
        select: {
          freeSetRecords: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
};

// 특정 센터의 FreeExercise 사용 통계 조회
export const getFreeExerciseUsageStats = async (fitnessCenterId: string) => {
  return await prisma.freeExercise.findMany({
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          freeSetRecords: {
            where: {
              ptRecordItem: {
                ptRecord: {
                  schedule: {
                    trainer: {
                      fitnessCenterId: fitnessCenterId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      freeSetRecords: {
        _count: "desc",
      },
    },
    take: 10, // 상위 10개만 조회
  });
};