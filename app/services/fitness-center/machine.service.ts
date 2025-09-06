import prisma from "@/app/lib/prisma";

// ===== 머신 기록용 데이터 조회 =====

/**
 * 피트니스 센터의 머신 목록을 운동 기록용으로 조회
 * MachineRecordForm 컴포넌트에서 사용할 수 있도록 가공된 데이터 반환
 */
export async function getMachineForRecordByFitnessCenter(centerId: string) {
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
          take: 1, // 첫 번째 이미지만
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

// 타입 추론
export type MachineForRecord = Awaited<
  ReturnType<typeof getMachineForRecordByFitnessCenter>
>[0];

export type MachineSettingForRecord = MachineForRecord["settings"][0];