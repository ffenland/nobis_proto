"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
const timeRegex = /^([01]\d|2[0-3])([0-5]\d)$/; // 0000 ~ 2359

export type IWeekOpenClose = {
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
};
export interface ICenterForm extends IWeekOpenClose {
  title: string;
  address: string;
  phone: string;
  description: string;
  trainers: string[] | false;
}

export interface ICenterFormData extends Omit<ICenterForm, "trainers"> {
  trainers: string[];
}

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

type SubmitNewCenterSuccess = {
  ok: true;
  data: {
    id: string;
  };
};
type SubmitNewCenterError = {
  ok: false;
  code: "ERROR";
  message: string;
};
export type SubmitNewCenterResult =
  | SubmitNewCenterSuccess
  | SubmitNewCenterError;

export const submitNewCenter = async (
  data: ICenterFormData
): Promise<SubmitNewCenterResult> => {
  try {
    const newFitnessCenter = await prisma.fitnessCenter.create({
      data: {
        title: data.title,
        address: data.address,
        phone: data.phone,
        description: data.description || "",
        trainers: {
          connect: data.trainers.map((trainerId) => ({
            id: trainerId,
          })),
        },
        openingHours: {
          connectOrCreate: [
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "MON",
                  openTime: parseInt(data.MON_open),
                  closeTime: parseInt(data.MON_close),
                },
              },
              create: {
                dayOfWeek: "MON",
                openTime: parseInt(data.MON_open),
                closeTime: parseInt(data.MON_close),
              },
            },
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "TUE",
                  openTime: parseInt(data.TUE_open),
                  closeTime: parseInt(data.TUE_close),
                },
              },
              create: {
                dayOfWeek: "TUE",
                openTime: parseInt(data.TUE_open),
                closeTime: parseInt(data.TUE_close),
              },
            },
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "WED",
                  openTime: parseInt(data.WED_open),
                  closeTime: parseInt(data.WED_close),
                },
              },
              create: {
                dayOfWeek: "WED",
                openTime: parseInt(data.WED_open),
                closeTime: parseInt(data.WED_close),
              },
            },
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "THU",
                  openTime: parseInt(data.THU_open),
                  closeTime: parseInt(data.THU_close),
                },
              },
              create: {
                dayOfWeek: "THU",
                openTime: parseInt(data.THU_open),
                closeTime: parseInt(data.THU_close),
              },
            },
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "FRI",
                  openTime: parseInt(data.FRI_open),
                  closeTime: parseInt(data.FRI_close),
                },
              },
              create: {
                dayOfWeek: "FRI",
                openTime: parseInt(data.FRI_open),
                closeTime: parseInt(data.FRI_close),
              },
            },
            {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: "SAT",
                  openTime: parseInt(data.SAT_open),
                  closeTime: parseInt(data.SAT_close),
                },
              },
              create: {
                dayOfWeek: "SAT",
                openTime: parseInt(data.SAT_open),
                closeTime: parseInt(data.SAT_close),
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

export const editCenter = async () => {};
