import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { formatMinutesToKorean, formatTime } from "@/app/lib/utils/time.utils";

// ===== 입력 타입 정의 (서비스파일에서 한다) =====

// 레슨 생성 입력 타입
export type CreateLessonInput = {
  scheduledAt: string; // ISO 8601 DateTime 문자열
  endAt: string; // ISO 8601 DateTime 문자열
  memo?: string;
};

// 트레이너 수업 충돌 검사 결과 타입 (충돌하는 수업 정보 배열)
export type ConflictingLesson = {
  id: string;
  scheduledAt: Date;
  endAt: Date;
  startTime: string; // "14:30"
  endTime: string; // "15:30"
  durationText: string; // "1시간 30분"
  memberName: string; // "김회원"
};

// ===== 서비스 함수들 (타입 추론 활용) =====

// 트레이너 수업 충돌 검사 함수 (활성 PT의 Lesson만 대상)
export async function checkTrainerLessonConflict(
  trainerId: string,
  scheduledAt: Date,
  endAt: Date
): Promise<ConflictingLesson[]> {
  try {
    // 트레이너의 활성 PT(CONFIRMED)의 Lesson 중 시간 겹치는 것들 조회
    // 시간 겹침 조건: (새 수업 시작 < 기존 수업 종료) AND (새 수업 종료 > 기존 수업 시작)
    const conflictingLessons = await prisma.lesson.findMany({
      where: {
        pt: {
          trainerId: trainerId,
          state: PtState.CONFIRMED,
        },
        isCanceled: false, // 취소되지 않은 레슨만 충돌 체크
        AND: [
          { scheduledAt: { lt: endAt } }, // 기존 수업 시작 < 새 수업 종료
          { endAt: { gt: scheduledAt } }, // 기존 수업 종료 > 새 수업 시작
        ],
      },
      select: {
        id: true,
        scheduledAt: true,
        endAt: true,
        pt: {
          select: {
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 충돌하는 수업들을 ConflictingLesson 타입으로 변환하여 반환
    return conflictingLessons.map((lesson) => {
      const startTime = formatTime(
        lesson.scheduledAt.getHours() * 100 + lesson.scheduledAt.getMinutes()
      );
      const endTime = formatTime(
        lesson.endAt.getHours() * 100 + lesson.endAt.getMinutes()
      );

      // 수업 시간 계산 (분 단위)
      const durationMinutes = Math.floor(
        (lesson.endAt.getTime() - lesson.scheduledAt.getTime()) / (1000 * 60)
      );
      const durationText = formatMinutesToKorean(durationMinutes);

      return {
        id: lesson.id,
        scheduledAt: lesson.scheduledAt,
        endAt: lesson.endAt,
        startTime,
        endTime,
        durationText,
        memberName: lesson.pt.member?.user.username || "알 수 없음",
      };
    });
  } catch (error) {
    console.error("Check trainer lesson conflict error:", error);
    throw error;
  }
}

// 레슨 Records 상세 조회 서비스 함수
export const getLessonDetailRecords = async ({
  lessonId,
  trainerId,
}: {
  lessonId: string;
  trainerId: string;
}) => {
  try {
    const lessonRecords = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        // 레코드 정보
        records: {
          where: {
            deletedAt: null, // 삭제되지 않은 기록만
          },
          select: {
            id: true,
            createdAt: true,
            entry: true,
            type: true,
            title: true,
            description: true,

            // 머신 운동 기록
            machineSetRecords: {
              select: {
                id: true,
                set: true,
                reps: true,
                weight: true,
                settingValues: {
                  select: {
                    id: true,
                    value: true,
                    machineSetting: {
                      select: {
                        title: true,
                        unit: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                set: "asc",
              },
            },

            // 프리 운동 기록
            freeSetRecords: {
              select: {
                id: true,
                set: true,
                reps: true,
                weight: true,
                freeExercise: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                  },
                },
                freeSetEquipments: {
                  select: {
                    equipment: {
                      select: {
                        title: true,
                        unit: true,
                      },
                    },
                    value: true,
                    notes: true,
                    order: true,
                  },
                },
              },
              orderBy: {
                set: "asc",
              },
            },

            // 스트레칭 기록
            stretchingExerciseRecords: {
              select: {
                id: true,
                description: true,
                stretchingExercise: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                  },
                },
                stretchingEquipments: {
                  select: {
                    equipment: {
                      select: {
                        title: true,
                        unit: true,
                      },
                    },
                    value: true,
                    notes: true,
                  },
                },
              },
            },
          },
          orderBy: {
            entry: "asc",
          },
        },
      },
    });
    if (!lessonRecords) {
      // 레슨이 없거나 권한이 없는 경우 null 반환
      return null;
    }
    // 운동 기록 (복잡한 구조는 유지)
    const records = lessonRecords.records.map((record) => ({
      id: record.id,
      lessonId,
      entry: record.entry,
      type: record.type,
      title: record.title || "",
      description: record.description || "",
      isActive: true, // LessonRecord에는 isActive 필드가 없음
      machineSetRecords: record.machineSetRecords,
      freeSetRecords: record.freeSetRecords,
      stretchingExerciseRecords: record.stretchingExerciseRecords,
    }));
    return records;
  } catch (error) {
    console.error("Get lesson detail error:", error);
    // 에러 발생 시 null 반환
    return null;
  }
};

export type LessonDetailRecord = NonNullable<
  Awaited<ReturnType<typeof getLessonDetailRecords>>
>[number];

// 레슨 상세 조회 서비스 함수 - 타입 추론 활용
export async function getLessonDetail({
  lessonId,
  trainerId,
}: {
  lessonId: string;
  trainerId: string;
}) {
  try {
    // 실제 Prisma 쿼리 - WHERE 절에서 바로 권한 체크
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        id: true,
        memo: true,
        scheduledAt: true,
        endAt: true,

        // PT 정보
        pt: {
          select: {
            id: true,
            state: true,
            ptProduct: {
              select: {
                title: true,
                totalCount: true,
                time: true,
              },
            },
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                    mobile: true,
                    avatarImage: {
                      select: {
                        cloudflareId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // 피트니스 센터 정보
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!lesson) {
      // 레슨이 없거나 권한이 없는 경우 null 반환
      return null;
    }

    // 레슨 번호 계산 (완료된 레슨 수 + 1)
    const completedLessons = await prisma.lesson.count({
      where: {
        ptId: lesson.pt.id,
        scheduledAt: {
          lt: lesson.scheduledAt,
        },
        records: {
          some: {},
        },
      },
    });

    // 시간 계산
    const startHours = lesson.scheduledAt.getHours();
    const startMinutes = lesson.scheduledAt.getMinutes();
    const startTime = startHours * 100 + startMinutes; // HHMM 형식

    // 종료 시간 계산
    const endHours = lesson.endAt.getHours();
    const endMinutes = lesson.endAt.getMinutes();
    const endTime = endHours * 100 + endMinutes; // HHMM 형식

    // 데이터 가공하여 반환 (플랫 구조)
    return {
      // 기본 정보
      id: lesson.id,
      memo: lesson.memo,
      lessonNumber: completedLessons + 1,

      // PT 정보 (플랫하게)
      ptId: lesson.pt.id,
      ptState: lesson.pt.state,
      ptTitle: lesson.pt.ptProduct.title,
      ptTotalCount: lesson.pt.ptProduct.totalCount,
      ptSessionTime: lesson.pt.ptProduct.time,

      // 회원 정보 (플랫하게)
      memberName: lesson.pt.member?.user?.username || "알 수 없음",
      memberMobile: lesson.pt.member?.user?.mobile || "",
      memberAvatarId: lesson.pt.member?.user?.avatarImage?.cloudflareId || null,

      // 스케줄 정보 (플랫하게)
      scheduleDate: lesson.scheduledAt,
      startTime: startTime,
      endTime: endTime,

      // 센터 정보 (플랫하게)
      centerId: lesson.fitnessCenter?.id || "",
      centerName: lesson.fitnessCenter?.title || "센터 정보 없음",

      // TODO 항목
      scheduleChangeRequest: [], // TODO: 스케줄 변경 요청 구현
    };
  } catch (error) {
    console.error("Get lesson detail error:", error);
    // 에러 발생 시 null 반환
    return null;
  }
}

// 타입 추론
export type GetLessonDetailResult = Awaited<ReturnType<typeof getLessonDetail>>;

// 레슨 생성 서비스 함수
export async function createLesson(
  trainerId: string,
  ptId: string,
  data: CreateLessonInput
) {
  try {
    // PT 확인 및 권한 검증
    const pt = await prisma.pt.findUnique({
      where: {
        id: ptId,
        trainerId: trainerId,
        state: PtState.CONFIRMED, // 활성 PT만 레슨 생성 가능
      },
      select: {
        id: true,
        trainer: {
          select: {
            fitnessCenterId: true,
          },
        },
        ptProduct: {
          select: {
            totalCount: true,
          },
        },
        lessons: {
          where: {
            isCanceled: false,
          },
          select: { id: true },
        },
      },
    });

    if (!pt) {
      return {
        success: false,
        message: "해당 PT를 찾을 수 없거나 권한이 없습니다.",
      };
    }

    if (!pt.trainer?.fitnessCenterId) {
      return {
        success: false,
        message: "트레이너의 센터 정보가 없습니다.",
      };
    }
    if (pt.lessons.length >= pt.ptProduct.totalCount) {
      return {
        success: false,
        message: "이미 수업 횟수를 다 소진했습니다.",
      };
    }

    // scheduledAt과 endAt 파싱
    const scheduledAt = new Date(data.scheduledAt);
    const endAt = new Date(data.endAt);

    // 시간 중복 체크 (트레이너의 활성 PT 수업들과 충돌 검사)
    const conflictingLessons = await checkTrainerLessonConflict(
      trainerId,
      scheduledAt,
      endAt
    );

    if (conflictingLessons.length > 0) {
      const firstConflict = conflictingLessons[0];
      const message = `선택하신 날짜에 ${firstConflict.startTime}부터 ${firstConflict.endTime}까지 ${firstConflict.memberName}님과의 수업이 있습니다.`;

      // 에러를 던져서 API 에러 처리에서 409 상태로 반환
      throw new Error(message);
    }

    // TrainerOff와 충돌 검사
    const conflictingOffs = await prisma.trainerOff.findMany({
      where: {
        trainerId,
        state: { in: ["PENDING", "CONFIRMED"] },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: scheduledAt } }],
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        state: true,
      },
    });

    if (conflictingOffs.length > 0) {
      const firstOff = conflictingOffs[0];
      const startHour = firstOff.startAt.getHours();
      const endHour = firstOff.endAt.getHours();
      const endMinute = firstOff.endAt.getMinutes();

      let offType = "";
      if (startHour === 0 && endHour === 23 && endMinute === 59) {
        offType = "종일 휴무";
      } else if (startHour === 0 && endHour === 12 && endMinute === 59) {
        offType = "오전 휴무";
      } else if (startHour === 13 && endHour === 23 && endMinute === 59) {
        offType = "오후 휴무";
      } else {
        offType = "휴무";
      }

      const stateText = firstOff.state === "PENDING" ? " (승인 대기중)" : "";
      const message = `선택하신 시간에 ${offType} 일정이 있습니다${stateText}.`;

      // 에러를 던져서 API 에러 처리에서 409 상태로 반환
      throw new Error(message);
    }

    // 새 레슨 생성
    const lesson = await prisma.lesson.create({
      data: {
        ptId: ptId,
        scheduledAt: scheduledAt,
        endAt: endAt,
        fitnessCenterId: pt.trainer?.fitnessCenterId || "",
        memo: data.memo || "",
      },
      select: {
        id: true,
      },
    });

    return {
      success: true,
      lessonId: lesson.id,
      message: "새 수업이 성공적으로 등록되었습니다.",
    };
  } catch (error) {
    console.error("Create lesson error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "레슨 생성 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// 레슨 생성 결과 타입 정의
export type CreateLessonServiceResult =
  | {
      success: true;
      lessonId: string;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

// ===== 개별 운동 기록 CRUD =====

// Equipment 정보 타입 (FREE 및 STRETCHING 운동에서 사용)
export type EquipmentInfo = {
  equipmentId: string;
  value?: string; // "15kg", "20", "빨간색" 등 (선택사항)
  notes?: string; // 추가 메모 (선택사항)
  order?: number; // 순서 (선택사항, 기본값 0)
};

// ========== 운동 타입별 입력 타입 ==========

// 공통 필드
type RecordInputBase = {
  entry: number;
  title: string;
  description?: string;
  tempId?: string; // 클라이언트 임시 ID
};

// 머신 운동 기록 입력 타입
export type CreateMachineRecordInput = RecordInputBase & {
  type: "MACHINE";
  machineId: string;
  machineSetRecords: Array<{
    set: number;
    reps: number;
    weight?: number; // 중량 (kg 단위, nullable)
    settingValueIds: string[];
  }>;
};

// 프리 운동 기록 입력 타입
export type CreateFreeRecordInput = RecordInputBase & {
  type: "FREE";
  isCustomExercise: boolean;
  freeExerciseId?: string;
  customExerciseName?: string;
  customExerciseDescription?: string;
  freeSetRecords: Array<{
    set: number;
    reps: number;
    weight?: number; // 중량 (kg 단위, nullable)
    equipments: EquipmentInfo[];
  }>;
};

// 스트레칭 운동 기록 입력 타입
export type CreateStretchingRecordInput = RecordInputBase & {
  type: "STRETCHING";
  isCustomExercise: boolean;
  stretchingExerciseId?: string;
  customStretchingName?: string;
  customStretchingDescription?: string;
  stretchingDescription?: string;
  stretchingEquipments: EquipmentInfo[];
};

// 통합 운동 기록 입력 타입 (유니온)
export type CreateRecordInput =
  | CreateMachineRecordInput
  | CreateFreeRecordInput
  | CreateStretchingRecordInput;

// 단일 운동 기록 수정 타입
export type UpdateRecordInput =
  | Partial<CreateMachineRecordInput>
  | Partial<CreateFreeRecordInput>
  | Partial<CreateStretchingRecordInput>;

// 개별 운동 기록 추가
export async function addLessonRecordItem(
  trainerId: string,
  lessonId: string,
  record: CreateRecordInput
) {
  try {
    // 권한 체크 - 레슨이 해당 트레이너의 것인지 확인
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!lesson) {
      throw new Error("레슨을 찾을 수 없거나 권한이 없습니다.");
    }

    // 운동 타입별로 분리된 LessonRecord 생성
    let created;

    if (record.type === "MACHINE") {
      created = await prisma.lessonRecord.create({
        data: {
          lessonId: lessonId,
          entry: record.entry,
          type: "MACHINE",
          title: record.title,
          description: record.description,
          machineSetRecords: {
            create:
              record.machineSetRecords?.map((set) => ({
                set: set.set,
                reps: set.reps,
                weight: set.weight || null,
                settingValues: {
                  connect: set.settingValueIds.map((id) => ({ id })),
                },
              })) || [],
          },
        },
        select: {
          id: true,
          entry: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      });
    } else if (record.type === "FREE") {
      let freeExerciseId = record.freeExerciseId;

      // 커스텀 운동인 경우 먼저 FreeExercise 생성
      if (
        record.isCustomExercise &&
        record.customExerciseName &&
        record.customExerciseDescription
      ) {
        // 동일한 이름의 운동이 이미 존재하는지 확인
        const existingExercise = await prisma.freeExercise.findFirst({
          where: {
            title: record.customExerciseName.trim(),
          },
        });

        if (existingExercise) {
          freeExerciseId = existingExercise.id;
        } else {
          // 새로운 FreeExercise 생성
          const newExercise = await prisma.freeExercise.create({
            data: {
              title: record.customExerciseName.trim(),
              description: record.customExerciseDescription.trim(),
            },
          });
          freeExerciseId = newExercise.id;
        }
      }

      if (!freeExerciseId) {
        throw new Error("FREE 운동에는 freeExerciseId가 필요합니다.");
      }

      created = await prisma.lessonRecord.create({
        data: {
          lessonId: lessonId,
          entry: record.entry,
          type: "FREE",
          title: record.title,
          description: record.description,
          freeSetRecords: {
            create:
              record.freeSetRecords?.map((set) => ({
                set: set.set,
                reps: set.reps,
                weight: set.weight || null,
                freeExerciseId: freeExerciseId!,
                freeSetEquipments: {
                  create:
                    set.equipments.map((eq, index) => ({
                      equipmentId: eq.equipmentId,
                      value: eq.value || null,
                      notes: eq.notes || null,
                      order: eq.order ?? index,
                    })) || [],
                },
              })) || [],
          },
        },
        select: {
          id: true,
          entry: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      });
    } else if (record.type === "STRETCHING") {
      let stretchingExerciseId = record.stretchingExerciseId;

      // 커스텀 스트레칭인 경우 새로운 StretchingExercise 생성
      if (
        record.isCustomExercise &&
        record.customStretchingName &&
        record.customStretchingDescription
      ) {
        const customStretchingExercise = await prisma.stretchingExercise.create(
          {
            data: {
              title: record.customStretchingName,
              description: record.customStretchingDescription,
            },
          }
        );
        stretchingExerciseId = customStretchingExercise.id;
      }

      if (!stretchingExerciseId) {
        throw new Error(
          "STRETCHING 운동에는 stretchingExerciseId가 필요합니다."
        );
      }

      created = await prisma.lessonRecord.create({
        data: {
          lessonId: lessonId,
          entry: record.entry,
          type: "STRETCHING",
          title: record.title,
          description: record.description,
          stretchingExerciseRecords: {
            create: {
              stretchingExerciseId: stretchingExerciseId,
              description: record.stretchingDescription,
              stretchingEquipments: {
                create:
                  record.stretchingEquipments?.map((eq) => ({
                    equipmentId: eq.equipmentId,
                    value: eq.value || null,
                    notes: eq.notes || null,
                  })) || [],
              },
            },
          },
        },
        select: {
          id: true,
          entry: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      });
    } else {
      throw new Error(`지원하지 않는 운동 타입입니다`);
    }

    return {
      success: true,
      data: created,
      tempId: record.tempId, // 클라이언트 임시 ID 반환
    };
  } catch (error) {
    console.error("Add lesson record item error:", error);
    throw error;
  }
}

// 개별 운동 기록 수정
export async function updateLessonRecordItem(
  trainerId: string,
  recordId: string,
  data: UpdateRecordInput
) {
  try {
    // 권한 체크
    const record = await prisma.lessonRecord.findFirst({
      where: {
        id: recordId,
        lesson: {
          pt: {
            trainerId: trainerId,
          },
        },
      },
    });

    if (!record) {
      throw new Error("기록을 찾을 수 없거나 권한이 없습니다.");
    }

    // 업데이트
    const updated = await prisma.lessonRecord.update({
      where: { id: recordId },
      data: {
        title: data.title,
        description: data.description,
        // 필요한 경우 세트 정보도 업데이트
      },
      select: {
        id: true,
        entry: true,
        type: true,
        title: true,
        description: true,
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Update lesson record item error:", error);
    throw error;
  }
}

// 레슨 기록의 세트 수만 업데이트 (EditRecordModal용)
export async function updateLessonRecordSets(
  recordId: string,
  lessonId: string,
  trainerId: string,
  sets: Array<{ reps: number; weight?: number | null; [key: string]: any }>
) {
  try {
    // 권한 체크
    const record = await prisma.lessonRecord.findFirst({
      where: {
        id: recordId,
        lessonId: lessonId,
        lesson: {
          pt: {
            trainerId: trainerId,
          },
        },
      },
      select: {
        id: true,
        type: true,
        machineSetRecords: {
          select: { id: true, set: true },
          orderBy: { set: "asc" },
        },
        freeSetRecords: {
          select: { id: true, set: true },
          orderBy: { set: "asc" },
        },
      },
    });

    if (!record) {
      throw new Error("기록을 찾을 수 없거나 권한이 없습니다.");
    }

    // 타입에 따라 세트 업데이트
    if (record.type === "MACHINE") {
      // 기존 머신 세트 기록 업데이트 (reps, weight)
      for (
        let i = 0;
        i < sets.length && i < record.machineSetRecords.length;
        i++
      ) {
        await prisma.machineSetRecord.update({
          where: { id: record.machineSetRecords[i].id },
          data: {
            reps: sets[i].reps,
            weight: sets[i].weight ?? null,
          },
        });
      }
    } else if (record.type === "FREE") {
      // 기존 프리 세트 기록 업데이트 (reps, weight)
      for (
        let i = 0;
        i < sets.length && i < record.freeSetRecords.length;
        i++
      ) {
        await prisma.freeSetRecord.update({
          where: { id: record.freeSetRecords[i].id },
          data: {
            reps: sets[i].reps,
            weight: sets[i].weight ?? null,
          },
        });
      }
    }

    // 업데이트된 기록 반환
    const updated = await prisma.lessonRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        type: true,
        title: true,
        machineSetRecords: {
          select: {
            id: true,
            set: true,
            reps: true,
            weight: true,
            settingValues: {
              select: {
                id: true,
                value: true,
                machineSetting: {
                  select: {
                    title: true,
                    unit: true,
                  },
                },
              },
            },
          },
          orderBy: { set: "asc" },
        },
        freeSetRecords: {
          select: {
            id: true,
            set: true,
            reps: true,
            weight: true,
          },
          orderBy: { set: "asc" },
        },
      },
    });

    return {
      success: true,
      data: updated,
      message: "세트 정보가 업데이트되었습니다.",
    };
  } catch (error) {
    console.error("Update lesson record sets error:", error);
    throw error;
  }
}

// 개별 운동 기록 삭제
export async function deleteLessonRecordItem(
  recordId: string,
  lessonId: string,
  trainerId: string
) {
  try {
    // 권한 체크
    const record = await prisma.lessonRecord.findFirst({
      where: {
        id: recordId,
        lessonId: lessonId,
        lesson: {
          pt: {
            trainerId: trainerId,
          },
        },
      },
      select: {
        lessonId: true,
        entry: true,
      },
    });

    if (!record) {
      throw new Error("기록을 찾을 수 없거나 권한이 없습니다.");
    }

    // 소프트 삭제
    await prisma.lessonRecord.update({
      where: { id: recordId },
      data: {
        deletedAt: new Date(),
        deletedUserId: trainerId,
      },
    });

    // 해당 레슨의 다른 기록들 entry 재정렬
    const remainingRecords = await prisma.lessonRecord.findMany({
      where: {
        lessonId: record.lessonId,
        deletedAt: null,
        entry: { gt: record.entry },
      },
      orderBy: { entry: "asc" },
    });

    // entry 번호 업데이트
    for (const rec of remainingRecords) {
      await prisma.lessonRecord.update({
        where: { id: rec.id },
        data: { entry: rec.entry - 1 },
      });
    }

    return {
      success: true,
      message: "운동 기록이 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete lesson record item error:", error);
    throw error;
  }
}

// 레슨 메모 업데이트
export async function updateLessonMemo(
  trainerId: string,
  lessonId: string,
  memo: string
) {
  try {
    // 권한 체크
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!lesson) {
      throw new Error("레슨을 찾을 수 없거나 권한이 없습니다.");
    }

    // 메모 업데이트
    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: { memo },
      select: {
        id: true,
        memo: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: updated,
      message: "메모가 업데이트되었습니다.",
    };
  } catch (error) {
    console.error("Update lesson memo error:", error);
    throw error;
  }
}

// 스케줄 체크 전용 함수 (API 호출용)
export async function checkTrainerScheduleConflict(
  trainerId: string,
  scheduledAt: Date,
  endAt: Date
) {
  return await checkTrainerLessonConflict(trainerId, scheduledAt, endAt);
}

// ===== 컨디션 기록 관련 서비스 =====

// 컨디션 기록 생성 입력 타입
export type CreateLessonConditionInput = {
  conditionMemo?: string | null;
  imageIds: string[]; // Cloudflare에 업로드 후 받은 Image 모델의 ID들
};

// 컨디션 기록 생성 또는 업데이트
export async function createLessonCondition(
  lessonId: string,
  trainerId: string,
  data: CreateLessonConditionInput
) {
  try {
    // 권한 확인 - 해당 레슨의 트레이너인지 체크
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        pt: {
          select: {
            trainerId: true,
          },
        },
        conditionImages: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });

    if (!lesson || lesson.pt.trainerId !== trainerId) {
      throw new Error("권한이 없습니다");
    }

    // 새로 추가할 이미지들의 템플릿 정보 확인
    const newImages = await prisma.image.findMany({
      where: {
        id: { in: data.imageIds },
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    // 템플릿별 중복 체크 및 기존 이미지 교체
    const templatesToUpdate = new Map<string, string[]>(); // templateName -> imageIds[]

    for (const newImage of newImages) {
      const metadata = newImage.metadata as any;
      const templateName = metadata?.templateName;

      if (templateName) {
        if (!templatesToUpdate.has(templateName)) {
          templatesToUpdate.set(templateName, []);
        }
        templatesToUpdate.get(templateName)!.push(newImage.id);

        // 동일한 템플릿의 기존 이미지가 있다면 연결 해제
        const existingImagesForTemplate = lesson.conditionImages.filter(
          (img) => {
            const imgMetadata = img.metadata as any;
            return imgMetadata?.templateName === templateName;
          }
        );

        if (existingImagesForTemplate.length > 0) {
          await prisma.lesson.update({
            where: { id: lessonId },
            data: {
              conditionImages: {
                disconnect: existingImagesForTemplate.map((img) => ({
                  id: img.id,
                })),
              },
            },
          });
        }
      }
    }

    // 컨디션 정보 저장 또는 업데이트
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        conditionMemo: data.conditionMemo,
        // 새 이미지들 연결
        conditionImages: {
          connect: data.imageIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        conditionMemo: true,
        conditionImages: {
          select: {
            id: true,
            cloudflareId: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedLesson,
      message: "컨디션이 기록되었습니다.",
    };
  } catch (error) {
    console.error("Create lesson condition error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "컨디션 기록 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// 컨디션 기록 조회
export async function getLessonCondition(lessonId: string, trainerId: string) {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        id: true,
        conditionMemo: true,
        conditionImages: {
          select: {
            id: true,
            cloudflareId: true,
            createdAt: true,
            metadata: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        scheduledAt: true,
        endAt: true,
        pt: {
          select: {
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return null;
    }

    return lesson;
  } catch (error) {
    console.error("Get lesson condition error:", error);
    return null;
  }
}

// 특정 템플릿의 컨디션 기록 삭제
export async function deleteLessonConditionByTemplate(
  lessonId: string,
  trainerId: string,
  templateName: string
) {
  try {
    // 권한 확인
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        pt: {
          select: {
            trainerId: true,
          },
        },
        conditionImages: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });

    if (!lesson || lesson.pt.trainerId !== trainerId) {
      return {
        success: false,
        message: "권한이 없습니다",
      };
    }

    // 해당 템플릿의 이미지들 찾기
    const templateImages = lesson.conditionImages.filter((img) => {
      const metadata = img.metadata as any;
      return metadata?.templateName === templateName;
    });

    if (templateImages.length === 0) {
      return {
        success: false,
        message: "삭제할 컨디션 기록이 없습니다",
      };
    }

    // 특정 템플릿의 이미지들 연결 해제
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        conditionImages: {
          disconnect: templateImages.map((img) => ({ id: img.id })),
        },
      },
    });

    // 더 이상 연결된 컨디션 이미지가 없으면 메모도 삭제
    const remainingImages = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        conditionImages: { select: { id: true } },
      },
    });

    if (remainingImages && remainingImages.conditionImages.length === 0) {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { conditionMemo: null },
      });
    }

    return {
      success: true,
      message: `${templateName} 컨디션 기록이 삭제되었습니다.`,
    };
  } catch (error) {
    console.error("Delete lesson condition by template error:", error);
    return {
      success: false,
      message: "컨디션 기록 삭제 중 오류가 발생했습니다.",
    };
  }
}

// 컨디션 기록 전체 삭제
export async function deleteLessonCondition(
  lessonId: string,
  trainerId: string
) {
  try {
    // 권한 확인
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        pt: {
          select: {
            trainerId: true,
          },
        },
        conditionImages: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!lesson || lesson.pt.trainerId !== trainerId) {
      return {
        success: false,
        message: "권한이 없습니다",
      };
    }

    if (lesson.conditionImages.length === 0) {
      return {
        success: false,
        message: "삭제할 컨디션 기록이 없습니다",
      };
    }

    // 컨디션 기록 전체 삭제
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        conditionMemo: null,
        // 모든 컨디션 이미지 연결 해제
        conditionImages: {
          disconnect: lesson.conditionImages.map((img) => ({ id: img.id })),
        },
      },
    });

    return {
      success: true,
      message: "컨디션 기록이 삭제되었습니다.",
    };
  } catch (error) {
    console.error("Delete lesson condition error:", error);
    return {
      success: false,
      message: "컨디션 기록 삭제 중 오류가 발생했습니다.",
    };
  }
}

// 타입 추론
export type GetLessonConditionResult = Awaited<
  ReturnType<typeof getLessonCondition>
>;
export type CreateLessonConditionResult = Awaited<
  ReturnType<typeof createLessonCondition>
>;
export type DeleteLessonConditionResult = Awaited<
  ReturnType<typeof deleteLessonCondition>
>;

// 레슨 취소
export async function cancelLesson(
  trainerId: string,
  lessonId: string,
  reason?: string
) {
  try {
    // 권한 체크 및 레슨 존재 확인
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
        isCanceled: false, // 이미 취소된 레슨은 취소 불가
      },
      select: {
        id: true,
        scheduledAt: true,
        pt: {
          select: {
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new Error("레슨을 찾을 수 없거나 권한이 없습니다.");
    }

    // 레슨 취소 처리
    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        isCanceled: true,
        memo: reason ? `[취소사유] ${reason}` : "[취소됨]",
      },
      select: {
        id: true,
        scheduledAt: true,
        isCanceled: true,
        memo: true,
      },
    });

    return {
      success: true,
      data: updatedLesson,
      message: "레슨이 취소되었습니다.",
    };
  } catch (error) {
    console.error("Cancel lesson error:", error);
    throw error;
  }
}

// 타입 추론
export type CancelLessonResult = Awaited<ReturnType<typeof cancelLesson>>;

// 레슨 취소 가능 여부 체크
export async function checkLessonCancellable(
  trainerId: string,
  lessonId: string
) {
  try {
    // 권한 체크 및 레슨 정보 조회
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        pt: {
          trainerId: trainerId,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        isCanceled: true,
        memo: true,
        records: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
        images: {
          select: {
            id: true,
          },
        },
        videos: {
          select: {
            id: true,
          },
        },
        conditionImages: {
          select: {
            id: true,
          },
        },
        pt: {
          select: {
            id: true,
            member: {
              select: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return {
        canCancel: false,
        reason: "레슨을 찾을 수 없거나 권한이 없습니다.",
        lesson: null,
      };
    }

    if (lesson.isCanceled) {
      return {
        canCancel: false,
        reason: "이미 취소된 레슨입니다.",
        ptId: lesson.pt.id,
        lesson: {
          id: lesson.id,
          memberName: lesson.pt.member?.user?.username || "알 수 없음",
          scheduledAt: lesson.scheduledAt,
          isCanceled: lesson.isCanceled,
        },
      };
    }

    // 취소 불가능한 조건들 체크
    const hasRecords = lesson.records.length > 0;
    const hasImages = lesson.images.length > 0;
    const hasVideos = lesson.videos.length > 0;
    const hasConditionImages = lesson.conditionImages.length > 0;

    if (hasRecords || hasImages || hasVideos || hasConditionImages) {
      const reasons = [];
      if (hasRecords) reasons.push("운동 기록");
      if (hasImages) reasons.push("레슨 이미지");
      if (hasVideos) reasons.push("레슨 비디오");
      if (hasConditionImages) reasons.push("컨디션 이미지");

      return {
        canCancel: false,
        reason: `이미 ${reasons.join(
          ", "
        )}이 있어 취소할 수 없습니다. 기록을 먼저 삭제하시거나 수업을 진행해주세요.`,
        ptId: lesson.pt.id,
        lesson: {
          id: lesson.id,
          memberName: lesson.pt.member?.user?.username || "알 수 없음",
          scheduledAt: lesson.scheduledAt,
          isCanceled: lesson.isCanceled,
          memo: lesson.memo,
        },
      };
    }

    // 취소 가능한 경우
    return {
      canCancel: true,
      reason: null,
      ptId: lesson.pt.id,
      lesson: {
        id: lesson.id,
        memberName: lesson.pt.member?.user?.username || "알 수 없음",
        scheduledAt: lesson.scheduledAt,
        isCanceled: lesson.isCanceled,
        memo: lesson.memo,
      },
    };
  } catch (error) {
    console.error("Check lesson cancellable error:", error);
    return {
      canCancel: false,
      reason: "레슨 취소 가능 여부를 확인하는 중 오류가 발생했습니다.",
      lesson: null,
    };
  }
}

// 타입 추론
export type CheckLessonCancellableResult = Awaited<
  ReturnType<typeof checkLessonCancellable>
>;
