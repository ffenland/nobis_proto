"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import type { DateRange } from "react-day-picker";

export interface IPtProductForm {
  title: string;
  price: number;
  totalCount: number;
  description: string;
  onSale: string;
  isLimitedTime: string;
  dateRange: DateRange | undefined;
  trainers: ITrainerForSelect[];
  time?: number;
}

export interface IPtProductSubmitData
  extends Omit<IPtProductForm, "isLimitedTime" | "dateRange"> {
  openedAt: Date;
  closedAt: Date;
}

export type ITrainerForSelect = Prisma.PromiseReturnType<
  typeof getTrainersForPtProductSet
>[number];

interface INewPtProductSubmitSuccess {
  ok: true;
  data: {
    id: string;
  };
}
interface INewPtProductSubmitError {
  ok: false;
  error: string;
}
export type INewPtProductSubmitResult =
  | INewPtProductSubmitSuccess
  | INewPtProductSubmitError;
export const newPtProductSubmit = async (
  submitData: IPtProductSubmitData
): Promise<INewPtProductSubmitResult> => {
  try {
    const newPtProduct = await prisma.ptProduct.create({
      data: {
        title: submitData.title,
        price: Number(submitData.price),
        description: submitData.description,
        totalCount: Number(submitData.totalCount),
        ...(submitData.time && { time: submitData.time }),
        openedAt: submitData.openedAt,
        closedAt: submitData.closedAt,
        onSale: Boolean(submitData.onSale === "true"),
        trainer: {
          connect: submitData.trainers.map((trainer) => ({
            id: trainer.trainerId,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      data: {
        id: newPtProduct.id,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // 유니크 제약 조건 위반 에러 (P2002)
      if (error.code === "P2002") {
        return {
          ok: false,
          error: "중복된 이름이 있습니다. 다른 이름을 사용해 주세요.",
        };
      }
    }

    // 그 외의 모든 에러

    return {
      ok: false,
      error: `데이터베이스 에러가 발생했습니다. 잠시 후 다시 시도해 주세요. ${
        error instanceof Error ? error.message : ""
      }`,
    };
  }
};

export const getTrainersForPtProductSet = async () => {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });
  return trainers.map((trainer) => ({
    trainerId: trainer.id,
    username: trainer.user.username,
    chosen: true,
  }));
};
