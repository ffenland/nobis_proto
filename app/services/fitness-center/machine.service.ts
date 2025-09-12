import prisma from "@/app/lib/prisma";

// ===== 머신 기록용 데이터 조회 =====

/**
 * 피트니스 센터의 머신 목록을 운동 기록용으로 조회
 * MachineRecordForm 컴포넌트에서 사용할 수 있도록 가공된 데이터 반환
 */
export async function getMachinesByFitnessCenter(centerId: string) {
  try {
    // 센터의 모든 머신 조회
    const machines = await prisma.machine.findMany({
      where: {
        fitnessCenterId: centerId,
      },
      select: {
        id: true,
        title: true,
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
              orderBy: {
                value: "asc",
              },
            },
          },
        },
        images: {
          select: {
            cloudflareId: true,
          },
        },
      },
      orderBy: {
        title: "asc", // 이름순 정렬
      },
    });

    // MachineRecordForm 컴포넌트에 맞게 데이터 가공
    const formattedMachines = machines.map((machine) => ({
      id: machine.id,
      name: machine.title,
      description: undefined, // Machine 모델에 description 필드가 없음
      imageUrl: machine.images[0]?.cloudflareId || undefined,
      settings: machine.machineSetting.map((setting) => ({
        id: setting.id,
        name: setting.title,
        unit: setting.unit,
        // MachineSettingValue를 통해 가능한 값들 제공
        possibleValues: setting.values.map((v) => ({
          id: v.id,
          value: v.value,
        })),
      })),
    }));

    return formattedMachines;
  } catch (error) {
    console.error("Error fetching machines for record:", error);
    return [];
  }
}

// ===== 머신 상세 조회 =====

/**
 * 머신 ID로 상세 정보 조회
 * Machine 상세보기 페이지에서 사용
 */
export async function getMachineById(machineId: string) {
  const machine = await prisma.machine.findUnique({
    where: {
      id: machineId,
    },
    select: {
      id: true,
      title: true,
      fitnessCenterId: true,
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
            orderBy: {
              value: "asc",
            },
          },
        },
        orderBy: {
          title: "asc",
        },
      },
      images: {
        select: {
          id: true,
          cloudflareId: true,
        },
      },
    },
  });

  if (!machine) {
    throw new Error("머신을 찾을 수 없습니다.");
  }

  return machine;
}

// ===== 머신 생성 관련 =====

// Machine 생성 입력 타입
export interface CreateMachineInput {
  title: string;
  settings: {
    title: string;
    unit: string;
    values: string[];
  }[];
  images?: { cloudflareId: string; uploadedById: string }[];
}

// Machine 생성
export async function createMachine(
  fitnessCenterId: string,
  input: CreateMachineInput
) {
  const { title, settings, images = [] } = input;

  // 트랜잭션으로 Machine과 설정들을 함께 생성
  const createdMachine = await prisma.$transaction(async (tx) => {
    // 1. Machine 생성
    const machine = await tx.machine.create({
      data: {
        fitnessCenterId,
        title,
        images: images.length > 0
          ? {
              create: images.slice(0, 3).map((img) => ({
                cloudflareId: img.cloudflareId,
                type: "MACHINE" as const,
                uploadedById: img.uploadedById,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        fitnessCenterId: true,
        images: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
    });

    // 2. MachineSetting들 생성
    for (const setting of settings) {
      await tx.machineSetting.create({
        data: {
          machineId: machine.id,
          title: setting.title,
          unit: setting.unit,
          values: {
            create: setting.values.map((value) => ({
              value: value,
            })),
          },
        },
      });
    }

    // 3. 완성된 Machine 데이터 조회
    const completeMachine = await tx.machine.findUnique({
      where: { id: machine.id },
      select: {
        id: true,
        title: true,
        fitnessCenterId: true,
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
              orderBy: {
                value: "asc",
              },
            },
          },
          orderBy: {
            title: "asc",
          },
        },
        images: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
    });

    return completeMachine;
  });

  return createdMachine;
}

// 타입 추론
export type IMachinesByFitnessCenter = Awaited<
  ReturnType<typeof getMachinesByFitnessCenter>
>[0];

export type MachineSettingForRecord = IMachinesByFitnessCenter["settings"][0];

export type GetMachineByIdResult = Awaited<
  ReturnType<typeof getMachineById>
>;

export type CreateMachineResult = Awaited<
  ReturnType<typeof createMachine>
>;
