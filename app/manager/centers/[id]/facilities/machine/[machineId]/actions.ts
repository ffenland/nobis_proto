"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { IMachineValueEditState } from "./page";
import { ChangeSummary } from "./MachineChangeConfirm";

export type IMachineDetail = NonNullable<
  Prisma.PromiseReturnType<typeof getMachineDetail>
>;

export type IMachineSetting = IMachineDetail["machineSetting"][number];

export type IMachineSettingValue = IMachineSetting["values"][number];

export type UpdateMachineData = {
  title: string;
  machineSetting: {
    update: {
      where: { id: string };
      data: {
        title: string;
        unit: string;
        values: {
          deleteMany: {
            settingId: string;
            id: { notIn: string[] };
          };
          upsert: {
            where: { id: string };
            create: { value: string };
            update: { value: string };
          }[];
        };
      };
    }[];
  };
};

type MachineSettingUpdateData = {
  where: { id: string };
  data: {
    title?: string;
    unit?: string;
    values?: {
      deleteMany?: {
        machineSettingId: string;
        value: { in: string[] };
      };
      updateMany?: {
        where: { value: string };
        data: { value: string };
      }[];
      create?: { value: string }[];
    };
  };
};

type MachineSettingCreateData = {
  title: string;
  unit: string;
  values: {
    create: { value: string }[];
  };
};

type MachineUpdateData = {
  title?: string;
  machineSetting?: {
    create?: MachineSettingCreateData[];
    update?: MachineSettingUpdateData[];
  };
};

const compareValues = (a: string, b: string) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // 둘 다 숫자인 경우
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // 하나만 숫자인 경우 숫자를 앞으로
  if (!isNaN(numA)) return -1;
  if (!isNaN(numB)) return 1;

  // 둘 다 문자열인 경우
  return a.localeCompare(b);
};

export const getMachineDetail = async (id: string) => {
  const machine = await prisma.machine.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      machineSetting: {
        select: {
          id: true,
          title: true,
          unit: true,
          values: {
            select: {
              id: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!machine) return null;

  return {
    ...machine,
    machineSetting: machine.machineSetting.map((setting) => ({
      ...setting,
      isNew: false,
      values: setting.values
        .sort((a, b) => compareValues(a.value, b.value))
        .map((value) => ({
          ...value,
          editState: IMachineValueEditState.HOLD,
        })),
    })),
  };
};

type UpdateMachineFail = {
  ok: false;
  error: {
    message: string;
    code: string;
  };
};
type UpdateMachineSuccess = {
  ok: true;
  data: {
    machineId: string;
  };
};
export type UpdateMachineResult = UpdateMachineSuccess | UpdateMachineFail;

export const updateMachine = async (
  id: string,
  data: ChangeSummary
): Promise<UpdateMachineResult> => {
  try {
    // 새로운 세팅 필터링 및 유효성 검사
    const newSettings = data.settings
      .filter((setting) => setting.changes.title?.from === "")
      .filter((setting) => {
        const hasTitle = setting.changes.title?.to?.trim();
        const hasUnit = setting.changes.unit?.to?.trim();

        if (!hasTitle || !hasUnit) {
          console.warn(
            `새로운 세팅 추가 실패: 제목(${hasTitle ? "있음" : "없음"}), 단위(${
              hasUnit ? "있음" : "없음"
            })`
          );
          return false;
        }
        return true;
      });

    const updateData: MachineUpdateData = {};

    // 제목이 있는 경우에만 추가
    if (data.title?.to) {
      updateData.title = data.title.to;
    }

    // machineSetting 업데이트 데이터 구성
    const machineSettingData: MachineUpdateData["machineSetting"] = {};

    // 새로운 세팅이 있는 경우
    if (newSettings.length > 0) {
      machineSettingData.create = newSettings.map((setting) => ({
        title: setting.changes.title!.to,
        unit: setting.changes.unit!.to,
        values: {
          create:
            setting.changes.values?.added
              .filter((v) => v.value.trim())
              .map((v) => ({
                value: v.value,
              })) || [],
        },
      }));
    }

    // 기존 세팅 업데이트
    const updatedSettings = data.settings
      .filter((setting) => setting.changes.title?.from !== "")
      .map((setting) => {
        const settingData: MachineSettingUpdateData = {
          where: { id: setting.id },
          data: {},
        };

        // 제목이 변경된 경우
        if (setting.changes.title?.to) {
          settingData.data.title = setting.changes.title.to;
        }

        // 단위가 변경된 경우
        if (setting.changes.unit?.to) {
          settingData.data.unit = setting.changes.unit.to;
        }

        // 값 변경이 있는 경우
        if (setting.changes.values) {
          settingData.data.values = {};

          // 삭제된 값이 있는 경우
          if (setting.changes.values.removed.length > 0) {
            settingData.data.values.deleteMany = {
              machineSettingId: setting.id,
              value: {
                in: setting.changes.values.removed.map((v) => v.value),
              },
            };
          }

          // 수정된 값이 있는 경우
          if (setting.changes.values.modified.length > 0) {
            settingData.data.values.updateMany =
              setting.changes.values.modified.map((v) => ({
                where: { value: v.from },
                data: { value: v.to },
              }));
          }

          // 새로운 값이 있는 경우
          if (setting.changes.values.added.length > 0) {
            settingData.data.values.create = setting.changes.values.added
              .filter((v) => v.value.trim())
              .map((v) => ({
                value: v.value,
              }));
          }
        }

        return settingData;
      });

    if (updatedSettings.length > 0) {
      machineSettingData.update = updatedSettings;
    }

    if (Object.keys(machineSettingData).length > 0) {
      updateData.machineSetting = machineSettingData;
    }

    const updatedMachine = await prisma.machine.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      data: {
        machineId: updatedMachine.id,
      },
    };
  } catch (error) {
    console.error("Error updating machine:", error);
    return {
      ok: false,
      error: {
        message: "자료 쓰기에 실패했습니다. 다시 시도해주세요.",
        code: "DB_WRITE_ERROR",
      },
    };
  }
};
