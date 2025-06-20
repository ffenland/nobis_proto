// app/api/machines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 타입 정의
interface ChangeValue {
  value: string;
}

interface ValueChanges {
  added?: ChangeValue[];
  removed?: ChangeValue[];
  modified?: {
    value: string;
    from: string;
    to: string;
  }[];
}

interface SettingChanges {
  title?: {
    from: string;
    to: string;
  };
  unit?: {
    from: string;
    to: string;
  };
  values?: ValueChanges;
}

interface SettingChange {
  id: string;
  title: string;
  changes: SettingChanges;
}

interface ChangeSummary {
  title?: {
    from: string;
    to: string;
  };
  settings: SettingChange[];
}

interface MachineSettingCreateData {
  title: string;
  unit: string;
  values: {
    create: { value: string }[];
  };
}

interface MachineSettingUpdateData {
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
}

interface MachineUpdateData {
  title?: string;
  machineSetting?: {
    create?: MachineSettingCreateData[];
    update?: MachineSettingUpdateData[];
  };
}

interface CreateMachineRequest {
  centerId: string;
  title: string;
  machineSetting?: {
    title: string;
    unit: string;
    values?: { value: string }[];
  }[];
}

// 값 비교 함수
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

// GET /api/machines/[id] - 머신 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: machineId } = params;

    if (!machineId) {
      return NextResponse.json(
        { error: "머신 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
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

    if (!machine) {
      return NextResponse.json(
        { error: "머신을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 데이터 변환 (클라이언트에서 사용하는 형태로)
    const transformedMachine = {
      ...machine,
      machineSetting: machine.machineSetting.map((setting) => ({
        ...setting,
        isNew: false,
        values: setting.values
          .sort((a, b) => compareValues(a.value, b.value))
          .map((value) => ({
            ...value,
            editState: "HOLD", // IMachineValueEditState.HOLD
          })),
      })),
    };

    return NextResponse.json(transformedMachine, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Failed to fetch machine detail:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/machines/[id] - 머신 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: machineId } = params;
    const changeSummary: ChangeSummary = await request.json();

    if (!machineId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "머신 ID가 필요합니다.",
            code: "INVALID_PARAMS",
          },
        },
        { status: 400 }
      );
    }

    // 머신 존재 확인
    const existingMachine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!existingMachine) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "머신을 찾을 수 없습니다.",
            code: "MACHINE_NOT_FOUND",
          },
        },
        { status: 404 }
      );
    }

    // 새로운 세팅 필터링 및 유효성 검사
    const newSettings =
      changeSummary.settings
        ?.filter((setting: SettingChange) => setting.changes.title?.from === "")
        ?.filter((setting: SettingChange) => {
          const hasTitle = setting.changes.title?.to?.trim();
          const hasUnit = setting.changes.unit?.to?.trim();

          if (!hasTitle || !hasUnit) {
            console.warn(
              `새로운 세팅 추가 실패: 제목(${
                hasTitle ? "있음" : "없음"
              }), 단위(${hasUnit ? "있음" : "없음"})`
            );
            return false;
          }
          return true;
        }) || [];

    const updateData: MachineUpdateData = {};

    // 제목이 있는 경우에만 추가
    if (changeSummary.title?.to) {
      updateData.title = changeSummary.title.to;
    }

    // machineSetting 업데이트 데이터 구성
    const machineSettingData: MachineUpdateData["machineSetting"] = {};

    // 새로운 세팅이 있는 경우
    if (newSettings.length > 0) {
      machineSettingData.create = newSettings.map(
        (setting: SettingChange): MachineSettingCreateData => ({
          title: setting.changes.title!.to,
          unit: setting.changes.unit!.to,
          values: {
            create:
              setting.changes.values?.added
                ?.filter((v: ChangeValue) => v.value.trim())
                ?.map((v: ChangeValue) => ({
                  value: v.value,
                })) || [],
          },
        })
      );
    }

    // 기존 세팅 업데이트
    const updatedSettings =
      changeSummary.settings
        ?.filter((setting: SettingChange) => setting.changes.title?.from !== "")
        ?.map((setting: SettingChange): MachineSettingUpdateData => {
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
            if (
              setting.changes.values.removed &&
              setting.changes.values.removed.length > 0
            ) {
              settingData.data.values.deleteMany = {
                machineSettingId: setting.id,
                value: {
                  in: setting.changes.values.removed.map(
                    (v: ChangeValue) => v.value
                  ),
                },
              };
            }

            // 수정된 값이 있는 경우
            if (
              setting.changes.values.modified &&
              setting.changes.values.modified.length > 0
            ) {
              settingData.data.values.updateMany =
                setting.changes.values.modified.map((v) => ({
                  where: { value: v.from },
                  data: { value: v.to },
                }));
            }

            // 새로운 값이 있는 경우
            if (
              setting.changes.values.added &&
              setting.changes.values.added.length > 0
            ) {
              settingData.data.values.create = setting.changes.values.added
                .filter((v: ChangeValue) => v.value.trim())
                .map((v: ChangeValue) => ({
                  value: v.value,
                }));
            }
          }

          return settingData;
        }) || [];

    if (updatedSettings.length > 0) {
      machineSettingData.update = updatedSettings;
    }

    if (Object.keys(machineSettingData).length > 0) {
      updateData.machineSetting = machineSettingData;
    }

    const updatedMachine = await prisma.machine.update({
      where: { id: machineId },
      data: updateData,
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        machineId: updatedMachine.id,
      },
    });
  } catch (error) {
    console.error("Error updating machine:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "자료 쓰기에 실패했습니다. 다시 시도해주세요.",
          code: "DB_WRITE_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/machines/[id] - 머신 생성 (센터 ID를 body에서 받음)
export async function POST(request: NextRequest) {
  try {
    const requestData: CreateMachineRequest = await request.json();
    const { centerId, title, machineSetting } = requestData;

    if (!centerId || !title) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "센터 ID와 머신 이름이 필요합니다.",
            code: "INVALID_PARAMS",
          },
        },
        { status: 400 }
      );
    }

    // 센터 존재 확인
    const center = await prisma.fitnessCenter.findUnique({
      where: { id: centerId },
      select: { id: true },
    });

    if (!center) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "센터를 찾을 수 없습니다.",
            code: "CENTER_NOT_FOUND",
          },
        },
        { status: 404 }
      );
    }

    const newMachine = await prisma.machine.create({
      data: {
        title,
        fitnessCenterId: centerId,
        machineSetting: machineSetting
          ? {
              create: machineSetting.map((setting) => ({
                title: setting.title,
                unit: setting.unit,
                values: {
                  create:
                    setting.values?.map((value) => ({
                      value: value.value,
                    })) || [],
                },
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          machineId: newMachine.id,
          machine: newMachine,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating machine:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "머신 생성에 실패했습니다.",
          code: "DB_WRITE_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/machines/[id] - 머신 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: machineId } = params;

    if (!machineId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "머신 ID가 필요합니다.",
            code: "INVALID_PARAMS",
          },
        },
        { status: 400 }
      );
    }

    // 머신 존재 확인
    const existingMachine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, title: true },
    });

    if (!existingMachine) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "머신을 찾을 수 없습니다.",
            code: "MACHINE_NOT_FOUND",
          },
        },
        { status: 404 }
      );
    }

    // 머신 삭제 (관련 설정과 값들도 cascade로 삭제됨)
    await prisma.machine.delete({
      where: { id: machineId },
    });

    return NextResponse.json({
      ok: true,
      data: {
        deletedMachineId: machineId,
        message: `${existingMachine.title} 머신이 삭제되었습니다.`,
      },
    });
  } catch (error) {
    console.error("Error deleting machine:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "머신 삭제에 실패했습니다.",
          code: "DB_DELETE_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
