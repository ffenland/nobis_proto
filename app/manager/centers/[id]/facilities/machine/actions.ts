"use server";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export type IMachineListItem = NonNullable<
  Prisma.PromiseReturnType<typeof getMachines>
>[number];

const getMachines = async (centerId: string) =>
  await prisma.machine.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
    },
  });

interface IGetAllMachineListOfCenterSuccess {
  ok: true;
  data: {
    machines: IMachineListItem[];
    center: {
      id: string;
      title: string;
    };
  };
}

type IGetAllMachineListOfCenterFail = {
  ok: false;
  error: {
    message: string;
  };
};

export type IGetAllMachineListOfCenterResult =
  | IGetAllMachineListOfCenterSuccess
  | IGetAllMachineListOfCenterFail;

export const getAllMachineListOfCenter = async (
  centerId: string
): Promise<IGetAllMachineListOfCenterResult> => {
  const fitnessCenter = await prisma.fitnessCenter.findUnique({
    where: {
      id: centerId,
    },
    select: {
      id: true,
      title: true,
    },
  });
  if (!fitnessCenter) {
    return {
      ok: false,
      error: {
        message: "센터를 찾을 수 없습니다.",
      },
    };
  }
  const allMachines = await getMachines(centerId);
  return {
    ok: true,
    data: {
      machines: allMachines,
      center: fitnessCenter,
    },
  };
};
