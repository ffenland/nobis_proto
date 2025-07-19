"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// PT 기록 조회 액션
export const getPtRecordAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // 트레이너 권한 확인
  if (session.role !== "TRAINER") {
    throw new Error("트레이너만 접근할 수 있습니다.");
  }

  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
      },
    },
    select: {
      id: true,
      memo: true,
      pt: {
        select: {
          id: true,
          member: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          trainer: {
            select: {
              id: true,
              fitnessCenter: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      items: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          title: true,
          machineSetRecords: {
            select: {
              id: true,
              set: true,
              reps: true,
              settingValues: {
                select: {
                  id: true,
                  value: true,
                  machineSetting: {
                    select: {
                      id: true,
                      title: true,
                      unit: true,
                      machine: {
                        select: {
                          id: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          freeSetRecords: {
            select: {
              id: true,
              set: true,
              reps: true,
              equipments: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  primaryValue: true,
                  primaryUnit: true,
                },
              },
            },
          },
          stretchingExerciseRecords: {
            select: {
              id: true,
              stretchingExercise: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("PT 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// 메모 수정 액션 - FormData를 받아서 처리
export const updateMemoAction = async (formData: FormData): Promise<void> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // 트레이너 권한 확인
  if (session.role !== "TRAINER") {
    throw new Error("트레이너만 접근할 수 있습니다.");
  }

  // FormData에서 데이터 추출
  const ptRecordId = formData.get("ptRecordId") as string;
  const memo = formData.get("memo") as string;

  if (!ptRecordId) {
    throw new Error("PT 기록 ID가 필요합니다.");
  }

  // PT 기록이 해당 트레이너의 것인지 확인
  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: session.roleId,
      },
    },
  });

  if (!ptRecord) {
    throw new Error("PT 기록을 찾을 수 없거나 권한이 없습니다.");
  }

  // 메모 업데이트
  await prisma.ptRecord.update({
    where: {
      id: ptRecordId,
    },
    data: {
      memo: memo || "",
      updatedAt: new Date(),
    },
  });

  // 캐시 재검증
  revalidatePath(`/trainer/pt-records/${ptRecordId}`);
  revalidatePath(`/trainer/pt-records/${ptRecordId}/edit`);

  // 성공 시 상세 페이지로 리다이렉트
  redirect(`/trainer/pt-records/${ptRecordId}`);
};

// 타입 추론을 위한 타입 정의
export type PtRecordEditData = Awaited<ReturnType<typeof getPtRecordAction>>;
export type PtRecordEditItem = PtRecordEditData["items"][number];
