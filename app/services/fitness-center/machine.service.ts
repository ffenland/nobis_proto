import prisma from "@/app/lib/prisma";

// ===== 머신 기록용 데이터 조회 =====

/**
 * 피트니스 센터의 머신 목록을 운동 기록용으로 조회
 * MachineRecordForm 컴포넌트에서 사용할 수 있도록 가공된 데이터 반환
 */
export async function getMachinesByFitnessCenter(centerId: string) {
  try {
    // 센터의 활성화된 머신만 조회
    const machines = await prisma.machine.findMany({
      where: {
        fitnessCenterId: centerId,
        isActive: true,
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
            isPrimary: true,
          },
        },
      },
      orderBy: {
        title: "asc", // 이름순 정렬
      },
    });

    // MachineRecordForm 컴포넌트에 맞게 데이터 가공
    const formattedMachines = machines.map((machine) => {
      // 대표 이미지 우선, 없으면 첫 번째 이미지 사용
      const primaryImage = machine.images.find((img) => img.isPrimary);
      const imageToUse = primaryImage || machine.images[0];

      return {
        id: machine.id,
        name: machine.title,
        description: undefined, // Machine 모델에 description 필드가 없음
        imageUrl: imageToUse?.cloudflareId || undefined,
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
      };
    });

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
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      model: true,
      description: true,
      spec: true,
      musclesUsed: true,
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
          isPrimary: true,
        },
      },
      videos: {
        select: {
          id: true,
          streamId: true,
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
  brand: string; // 브랜드 이름 (새로 생성하거나 기존 브랜드 선택)
  model?: string | null;
  description: string;
  spec?: string | null;
  musclesUsed?: string | null;
  settings: {
    title: string;
    unit: string;
    values: string[];
  }[];
}

// Machine 생성
export async function createMachine(
  fitnessCenterId: string,
  input: CreateMachineInput
) {
  const { title, brand, model, description, spec, musclesUsed, settings } =
    input;

  // 트랜잭션으로 Machine과 설정들을 함께 생성
  const createdMachine = await prisma.$transaction(async (tx) => {
    // 1. MachineBrand 찾기 또는 생성
    let machineBrand = await tx.machineBrand.findUnique({
      where: { name: brand },
      select: {
        id: true,
      },
    });

    if (!machineBrand) {
      // 브랜드가 없으면 새로 생성
      machineBrand = await tx.machineBrand.create({
        data: { name: brand },
        select: {
          id: true,
        },
      });
    }

    // 2. Machine 생성
    const machine = await tx.machine.create({
      data: {
        fitnessCenterId,
        title,
        brandId: machineBrand.id,
        model,
        description,
        spec,
        musclesUsed,
      },
      select: {
        id: true,
        title: true,
      },
    });

    // 3. MachineSetting들 생성
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

    return machine;
  });

  return createdMachine;
}

// ===== MachineBrand 관련 =====

/**
 * 모든 머신 브랜드 목록 조회
 */
export async function getAllMachineBrands() {
  const brands = await prisma.machineBrand.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          machines: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return brands;
}

// 타입 추론
export type IMachinesByFitnessCenter = Awaited<
  ReturnType<typeof getMachinesByFitnessCenter>
>[0];

export type MachineSettingForRecord = IMachinesByFitnessCenter["settings"][0];

export type GetMachineByIdResult = Awaited<ReturnType<typeof getMachineById>>;

export type CreateMachineResult = Awaited<ReturnType<typeof createMachine>>;

export type GetAllMachineBrandsResult = Awaited<
  ReturnType<typeof getAllMachineBrands>
>;

export type MachineBrand = GetAllMachineBrandsResult[0];

// ===== 머신 비활성화 관련 =====

// Machine 비활성화 입력 타입
export interface DeactivateMachineInput {
  machineId: string;
}

/**
 * 머신을 삭제 처리
 * 1. 한 번도 사용되지 않은 머신인지 확인 (모든 MachineSettingValue가 MachineSetRecord와 연결 안됨)
 * 2. 사용된 적 없으면: 완전 삭제 (Cloudflare 이미지/비디오 + Machine + MachineSetting + MachineSettingValue)
 * 3. 사용된 적 있으면: 소프트 삭제 (Cloudflare 이미지/비디오 삭제 + Machine 비활성화)
 */
export async function deactivateMachine(machineId: string) {
  // 1. 머신과 연결된 모든 데이터 조회
  const machine = await prisma.machine.findUnique({
    where: {
      id: machineId,
    },
    select: {
      id: true,
      title: true,
      images: {
        select: {
          id: true,
          cloudflareId: true,
        },
      },
      videos: {
        select: {
          id: true,
          streamId: true,
        },
      },
      machineSetting: {
        select: {
          id: true,
          values: {
            select: {
              id: true,
              machineSetRecords: {
                select: {
                  id: true,
                },
                take: 1, // 하나라도 있는지만 확인
              },
            },
          },
        },
      },
    },
  });

  if (!machine) {
    throw new Error("머신을 찾을 수 없습니다.");
  }

  // 2. 사용 기록 확인: 모든 MachineSettingValue가 MachineSetRecord와 연결되지 않았는지 체크
  const hasRecords = machine.machineSetting.some((setting) =>
    setting.values.some((value) => value.machineSetRecords.length > 0)
  );

  // 3. Cloudflare에서 이미지 삭제
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareApiToken = process.env.CLOUDFLARE_IMAGES_TOKEN;
  const cloudflareStreamToken = process.env.CLOUDFLARE_STREAM_TOKEN;

  if (!cloudflareAccountId || !cloudflareApiToken) {
    throw new Error("Cloudflare 설정이 누락되었습니다.");
  }

  const deletedImageIds: string[] = [];
  const failedImageIds: string[] = [];

  // 이미지 삭제
  for (const image of machine.images) {
    try {
      const cloudflareResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v1/${encodeURIComponent(
          image.cloudflareId
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
          },
        }
      );

      const result = await cloudflareResponse.json();

      if (result.success || cloudflareResponse.status === 404) {
        deletedImageIds.push(image.id);
      } else {
        console.error(
          `Failed to delete image from Cloudflare: ${image.cloudflareId}`,
          result
        );
        failedImageIds.push(image.id);
      }
    } catch (error) {
      console.error(
        `Error deleting image from Cloudflare: ${image.cloudflareId}`,
        error
      );
      failedImageIds.push(image.id);
    }
  }

  // 비디오 삭제
  const deletedVideoIds: string[] = [];
  const failedVideoIds: string[] = [];

  if (cloudflareStreamToken) {
    for (const video of machine.videos) {
      try {
        const cloudflareResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${video.streamId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${cloudflareStreamToken}`,
            },
          }
        );

        if (cloudflareResponse.ok || cloudflareResponse.status === 404) {
          deletedVideoIds.push(video.id);
        } else {
          console.error(
            `Failed to delete video from Cloudflare: ${video.streamId}`
          );
          failedVideoIds.push(video.id);
        }
      } catch (error) {
        console.error(
          `Error deleting video from Cloudflare: ${video.streamId}`,
          error
        );
        failedVideoIds.push(video.id);
      }
    }
  }

  // 4. DB에서 미디어 삭제
  if (deletedImageIds.length > 0) {
    await prisma.image.deleteMany({
      where: {
        id: {
          in: deletedImageIds,
        },
      },
    });
  }

  if (deletedVideoIds.length > 0) {
    await prisma.video.deleteMany({
      where: {
        id: {
          in: deletedVideoIds,
        },
      },
    });
  }

  // 5. 사용 기록 여부에 따라 완전 삭제 or 소프트 삭제
  if (!hasRecords) {
    // 한 번도 사용되지 않은 머신 → 완전 삭제
    // 삭제 순서: MachineSettingValue → MachineSetting → Machine
    await prisma.$transaction(async (tx) => {
      // 5-1. MachineSettingValue 삭제
      for (const setting of machine.machineSetting) {
        await tx.machineSettingValue.deleteMany({
          where: {
            machineSettingId: setting.id,
          },
        });
      }

      // 5-2. MachineSetting 삭제
      await tx.machineSetting.deleteMany({
        where: {
          machineId: machineId,
        },
      });

      // 5-3. Machine 삭제
      await tx.machine.delete({
        where: {
          id: machineId,
        },
      });
    });

    return {
      deleted: true,
      machineTitle: machine.title,
      deletedImages: deletedImageIds.length,
      failedImages: failedImageIds.length,
      deletedVideos: deletedVideoIds.length,
      failedVideos: failedVideoIds.length,
    };
  } else {
    // 사용 기록이 있는 머신 → 소프트 삭제 (비활성화)
    const deactivatedMachine = await prisma.machine.update({
      where: {
        id: machineId,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        deactivatedAt: true,
      },
    });

    return {
      deleted: false,
      deactivatedMachine,
      deletedImages: deletedImageIds.length,
      failedImages: failedImageIds.length,
      deletedVideos: deletedVideoIds.length,
      failedVideos: failedVideoIds.length,
    };
  }
}

// 타입 추론
export type DeactivateMachineResult = Awaited<
  ReturnType<typeof deactivateMachine>
>;
