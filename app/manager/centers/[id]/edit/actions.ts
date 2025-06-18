"use server";

import prisma from "@/app/lib/prisma";
import { Prisma, WeekDay } from "@prisma/client";
import { ICenterFormData } from "../../new/actions";
import { serverError } from "@/app/lib/constants";

export type ICenterInfo = Prisma.PromiseReturnType<typeof getCenterInfo>;

export const getCenterInfo = async (centerId: string) => {
  const center = await prisma.fitnessCenter.findUnique({
    where: {
      id: centerId,
    },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      openingHours: {
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
        },
      },
    },
  });
  return center;
};

export const updateCenter = async ({
  basicFields,
  trainerFields,
  opeingHoursFields,
  openingHoursRemain,
  centerId,
}: {
  basicFields: {
    description?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    title?: string | undefined;
  };
  trainerFields: {
    trainers?:
      | {
          set: {
            id: string;
          }[];
        }
      | undefined;
  };
  opeingHoursFields: {
    dayOfWeek: WeekDay;
    openTime: string;
    closeTime: string;
  }[];
  openingHoursRemain: string[];
  centerId: string;
}) => {
  try {
    console.log(openingHoursRemain);
    const updated = await prisma.fitnessCenter.update({
      where: {
        id: centerId,
      },
      data: {
        ...(basicFields.title && { title: basicFields.title }),
        ...(basicFields.address && { address: basicFields.address }),
        ...(basicFields.phone && { phone: basicFields.phone }),
        ...(basicFields.description && {
          description: basicFields.description,
        }),

        ...(trainerFields.trainers && { trainers: trainerFields.trainers }),
        openingHours: {
          set: [],
          connectOrCreate: opeingHoursFields.map((oh) => {
            return {
              where: {
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: oh.dayOfWeek,
                  openTime: parseInt(oh.openTime),
                  closeTime: parseInt(oh.closeTime),
                },
              },
              create: {
                dayOfWeek: oh.dayOfWeek,
                openTime: parseInt(oh.openTime),
                closeTime: parseInt(oh.closeTime),
              },
            };
          }),
          connect: openingHoursRemain.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });
    return {
      ok: true,
      data: {
        id: centerId,
      },
    };
  } catch (error) {
    console.log(error.message);
    return { ok: false, data: serverError.prisma.code };
  }
};
