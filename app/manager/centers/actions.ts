"use server";

import prisma from "@/app/lib/prisma";
import { convertKSTtoUTC } from "@/app/lib/utils";
import { Prisma } from "@prisma/client";
import { WeekDay } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ICenterSummary = Prisma.PromiseReturnType<
  typeof getCenterSummaries
>[number];
export const getCenterSummaries = async () => {
  const now = new Date();
  const serverNow = convertKSTtoUTC(now);
  const dbResult = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      description: true,
      phone: true,
      openingHours: {
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
        },
      },
      trainers: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
          pt: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
      offDays: {
        where: {
          date: {
            gte: serverNow,
          },
        },
      },
    },
  });
  const refinedResult = dbResult.map((center) => {
    return {
      ...center,
      trainers: center.trainers.map((tr) => {
        return tr.user.username;
      }),
      ptCount: center.trainers.reduce((acc, tr) => acc + tr.pt.length, 0),
    };
  });
  return refinedResult;
};

interface CreateFitnessCenterData {
  title: string;
  address: string;
  phone: string;
  description: string;
}

export async function createFitnessCenter(data: CreateFitnessCenterData) {
  try {
    const weekDays = [
      WeekDay.MON,
      WeekDay.TUE,
      WeekDay.WED,
      WeekDay.THU,
      WeekDay.FRI,
      WeekDay.SAT,
    ];

    const fitnessCenter = await prisma.fitnessCenter.create({
      data: {
        title: data.title,
        address: data.address,
        phone: data.phone,
        description: data.description,
        openingHours: {
          create: weekDays.map((day) => ({
            dayOfWeek: day,
            openTime: 900,
            closeTime: day === WeekDay.SAT ? 1300 : 2300,
            isClosed: false,
          })),
        },
      },
      include: {
        openingHours: true,
      },
    });

    revalidatePath("/manager/centers");
    return { success: true, data: fitnessCenter };
  } catch (error) {
    console.error("Error creating fitness center:", error);
    return { success: false, error: "헬스장 등록에 실패했습니다." };
  }
}
