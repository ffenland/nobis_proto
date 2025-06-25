"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
const timeRegex = /^([01]\d|2[0-3])([0-5]\d)$/; // 0000 ~ 2359

export interface IWeekOpenClose {
  MON_open: string;
  MON_close: string;
  TUE_open: string;
  TUE_close: string;
  WED_open: string;
  WED_close: string;
  THU_open: string;
  THU_close: string;
  FRI_open: string;
  FRI_close: string;
  SAT_open: string;
  SAT_close: string;
  SUN_open: string; // 일요일 추가
  SUN_close: string; // 일요일 추가

  // 휴무일 체크박스 (선택사항)
  MON_closed?: boolean;
  TUE_closed?: boolean;
  WED_closed?: boolean;
  THU_closed?: boolean;
  FRI_closed?: boolean;
  SAT_closed?: boolean;
  SUN_closed?: boolean; // 일요일 휴무 추가
}

export interface ICenterForm extends IWeekOpenClose {
  title: string;
  address: string;
  phone: string;
  description: string;
  trainers?: string[];
}
export interface ICenterFormData extends Partial<ICenterForm> {}

export type ITrainerForSelect = Prisma.PromiseReturnType<
  typeof getTrainers
>[number];

export const getTrainers = async () => {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: {
        select: {
          username: true,
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  return trainers.map((trainer) => ({
    trainerId: trainer.id,
    centerId: trainer.fitnessCenter?.id ?? null,
    centerName: trainer.fitnessCenter?.title ?? null,
    username: trainer.user.username,
    chosen: true,
  }));
};

export const createCenter = async (data: ICenterFormData) => {
  try {
    const newFitnessCenter = await prisma.fitnessCenter.create({
      data: {
        title: data.title!,
        address: data.address!,
        phone: data.phone!,
        description: data.description!,
        openingHours: {
          connectOrCreate: [
            // 월요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "MON",
                  openTime: data.MON_closed ? 0 : parseInt(data.MON_open!),
                  closeTime: data.MON_closed ? 0 : parseInt(data.MON_close!),
                },
              },
              create: {
                dayOfWeek: "MON",
                openTime: data.MON_closed ? 0 : parseInt(data.MON_open!),
                closeTime: data.MON_closed ? 0 : parseInt(data.MON_close!),
                isClosed: data.MON_closed || false,
              },
            },
            // 화요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "TUE",
                  openTime: data.TUE_closed ? 0 : parseInt(data.TUE_open!),
                  closeTime: data.TUE_closed ? 0 : parseInt(data.TUE_close!),
                },
              },
              create: {
                dayOfWeek: "TUE",
                openTime: data.TUE_closed ? 0 : parseInt(data.TUE_open!),
                closeTime: data.TUE_closed ? 0 : parseInt(data.TUE_close!),
                isClosed: data.TUE_closed || false,
              },
            },
            // 수요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "WED",
                  openTime: data.WED_closed ? 0 : parseInt(data.WED_open!),
                  closeTime: data.WED_closed ? 0 : parseInt(data.WED_close!),
                },
              },
              create: {
                dayOfWeek: "WED",
                openTime: data.WED_closed ? 0 : parseInt(data.WED_open!),
                closeTime: data.WED_closed ? 0 : parseInt(data.WED_close!),
                isClosed: data.WED_closed || false,
              },
            },
            // 목요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "THU",
                  openTime: data.THU_closed ? 0 : parseInt(data.THU_open!),
                  closeTime: data.THU_closed ? 0 : parseInt(data.THU_close!),
                },
              },
              create: {
                dayOfWeek: "THU",
                openTime: data.THU_closed ? 0 : parseInt(data.THU_open!),
                closeTime: data.THU_closed ? 0 : parseInt(data.THU_close!),
                isClosed: data.THU_closed || false,
              },
            },
            // 금요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "FRI",
                  openTime: data.FRI_closed ? 0 : parseInt(data.FRI_open!),
                  closeTime: data.FRI_closed ? 0 : parseInt(data.FRI_close!),
                },
              },
              create: {
                dayOfWeek: "FRI",
                openTime: data.FRI_closed ? 0 : parseInt(data.FRI_open!),
                closeTime: data.FRI_closed ? 0 : parseInt(data.FRI_close!),
                isClosed: data.FRI_closed || false,
              },
            },
            // 토요일
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "SAT",
                  openTime: data.SAT_closed ? 0 : parseInt(data.SAT_open!),
                  closeTime: data.SAT_closed ? 0 : parseInt(data.SAT_close!),
                },
              },
              create: {
                dayOfWeek: "SAT",
                openTime: data.SAT_closed ? 0 : parseInt(data.SAT_open!),
                closeTime: data.SAT_closed ? 0 : parseInt(data.SAT_close!),
                isClosed: data.SAT_closed || false,
              },
            },
            // 일요일 추가
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "SUN",
                  openTime: data.SUN_closed ? 0 : parseInt(data.SUN_open!),
                  closeTime: data.SUN_closed ? 0 : parseInt(data.SUN_close!),
                },
              },
              create: {
                dayOfWeek: "SUN",
                openTime: data.SUN_closed ? 0 : parseInt(data.SUN_open!),
                closeTime: data.SUN_closed ? 0 : parseInt(data.SUN_close!),
                isClosed: data.SUN_closed || false,
              },
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });
    return { ok: true, data: { id: newFitnessCenter.id } };
  } catch (error) {
    return { ok: false, code: "ERROR", message: error.message };
  }
};
