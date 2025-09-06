// app/trainer/lesson/[id]/record/page.tsx
"use client";
// Lesson을 기록, 수정하는 페이지. 트레이너가 보는 곳이므로 운동에 대한 자세한 설명은 필요없다.
import { use, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import {
  ChevronLeft,
  Clock,
  User,
  Edit,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatTime } from "@/app/lib/utils/time.utils";
import MachineRecordForm from "./MachineRecordForm";
import FreeRecordForm from "./FreeRecordForm";
import StretchingRecordForm from "./StretchingRecordForm";
import EditRecordModal from "../EditRecordModal";
import EnhancedConditionModal from "./EnhancedConditionModal";
import type { 
  GetLessonDetailResult,
  LessonDetailRecord
} from "@/app/services/trainer/lesson.service";
import type {
  GetFreeExercisesResult,
  GetStretchingExercisesResult,
} from "@/app/services/exercise/exercise.service";
import type { GetCenterEquipmentsResult } from "@/app/services/fitness-center/equipment.service";
import type { MachineForRecord } from "@/app/services/fitness-center/machine.service";
import UnauthorizedAccess from "../UnauthorizedAccess";

interface PageProps {
  params: Promise<{ id: string }>;
}
// id means Lesson Id
// 운동 기록 컴포넌트 상태용 타입 (추가 상태 필드 포함)
export type RecordedExerciseState = {
  id: string;
  tempId?: string; // useOptimistic용 임시 ID
  type: "MACHINE" | "FREE" | "STRETCHING";
  title: string;
  entry: number;
  saveStatus?: "saving" | "saved" | "error"; // 저장 상태
  dbId?: string; // DB에 저장된 후 받는 실제 ID
  details: {
    exerciseId?: string;
    exerciseName?: string;
    description?: string;
    sets?: Array<{
      reps: number;
      weight?: number;
      settings?: Array<{
        settingId: string;
        settingName: string;
        value: string;
        unit: string;
      }>;
    }>;
    equipmentIds?: string[];
    equipmentNames?: string[]; // 장비 이름 목록
    stretchingDescription?: string;
    duration?: string; // 스트레칭 지속 시간
    // 커스텀 운동 필드들 (폼에서만 사용)
    isCustomExercise?: boolean;
    customExerciseName?: string;
    customExerciseDescription?: string; // 커스텀 스트레칭 설명
    freeExerciseId?: string;
  };
};


export default function NewRecordPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<
    "MACHINE" | "FREE" | "STRETCHING" | null
  >(null);
  const [recordedExercises, setRecordedExercises] = useState<
    RecordedExerciseState[]
  >([]);
  const [memo, setMemo] = useState("");
  const [editingRecord, setEditingRecord] =
    useState<RecordedExerciseState | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);

  // SWR로 레슨 정보와 레코드 정보 분리하여 가져오기
  const {
    data: lesson,
    error: lessonError,
    isLoading: lessonLoading,
  } = useSWR<GetLessonDetailResult>(`/api/trainer/lesson/${id}`);

  const {
    data: records,
    error: recordsError,
    isLoading: recordsLoading,
    mutate: mutateRecords,
  } = useSWR<LessonDetailRecord[]>(
    lesson ? `/api/trainer/lesson/${id}/records` : null
  );

  // 컨디션 기록 조회
  const {
    data: conditionData,
    mutate: mutateCondition,
  } = useSWR(
    lesson ? `/api/trainer/lesson/${id}/condition` : null,
    {
      shouldRetryOnError: false, // 404 에러 시 재시도 안함
      revalidateOnFocus: false,
    }
  );

  // 프리로딩: 모든 운동 및 장비 데이터 병렬 조회
  const { data: machinesData, error: machinesError } = useSWR<{
    ok: boolean;
    data: MachineForRecord[];
  }>(
    lesson?.centerId ? `/api/fitness-center/${lesson.centerId}/machines` : null
  );

  const {
    data: freeExercisesData,
    error: freeExercisesError,
    mutate: mutateFreeExercises,
  } = useSWR<{
    ok: boolean;
    data: GetFreeExercisesResult;
  }>("/api/exercises/free");

  const {
    data: stretchingExercisesData,
    error: stretchingExercisesError,
    mutate: mutateStretchingExercises,
  } = useSWR<{
    ok: boolean;
    data: GetStretchingExercisesResult;
  }>("/api/exercises/stretching");

  const { data: equipmentsData, error: equipmentsError } = useSWR<{
    ok: boolean;
    data: GetCenterEquipmentsResult;
  }>(
    lesson?.centerId
      ? `/api/fitness-center/${lesson.centerId}/equipments`
      : null
  );

  // 프리로딩 데이터 추출
  const preloadedMachines = machinesData?.data || [];
  const preloadedFreeExercises = freeExercisesData?.data || [];
  const preloadedStretchingExercises = stretchingExercisesData?.data || [];
  const preloadedEquipments = equipmentsData?.data || [];

  // 각 데이터의 로딩 상태
  const isMachinesLoading = Boolean(
    lesson?.centerId && !machinesData && !machinesError
  );
  const isFreeExercisesLoading = !freeExercisesData && !freeExercisesError;
  const isStretchingExercisesLoading =
    !stretchingExercisesData && !stretchingExercisesError;
  const isEquipmentsLoading = Boolean(
    lesson?.centerId && !equipmentsData && !equipmentsError
  );

  // 기존 레슨 기록을 recordedExercises state에 로드
  useEffect(() => {
    if (records && records.length > 0) {
      const existingExercises: RecordedExerciseState[] = records.map(
        (item) => {
          // 기본 정보
          const baseExercise: RecordedExerciseState = {
            id: item.id,
            type: item.type as "MACHINE" | "FREE" | "STRETCHING",
            title: item.title,
            entry: item.entry,
            details: {
              exerciseId: item.id,
              exerciseName: item.title,
              description: item.description || undefined,
            },
          };

          // 타입별 상세 정보 추가
          if (item.type === "MACHINE" && item.machineSetRecords) {
            baseExercise.details.sets = item.machineSetRecords.map((set) => ({
              reps: set.reps,
              settings: set.settingValues?.map((sv) => ({
                settingId: sv.id,
                settingName: sv.machineSetting.title,
                value: sv.value,
                unit: sv.machineSetting.unit,
              })),
            }));
          } else if (item.type === "FREE" && item.freeSetRecords) {
            baseExercise.details.sets = item.freeSetRecords.map((set) => ({
              reps: set.reps,
              weight: set.equipments[0]?.primaryValue || undefined,
            }));
            baseExercise.details.equipmentIds = item.freeSetRecords
              .flatMap((set) => set.equipments.map((eq) => eq.id))
              .filter((id, index, self) => self.indexOf(id) === index); // 중복 제거
            baseExercise.details.equipmentNames = item.freeSetRecords
              .flatMap((set) => set.equipments.map((eq) => eq.group.name))
              .filter((name, index, self) => self.indexOf(name) === index); // 중복 제거
          } else if (
            item.type === "STRETCHING" &&
            item.stretchingExerciseRecords
          ) {
            const stretchRecord = item.stretchingExerciseRecords[0];
            if (stretchRecord) {
              baseExercise.details.stretchingDescription =
                stretchRecord.description || undefined;
              baseExercise.details.equipmentIds = stretchRecord.equipments.map(
                (eq) => eq.id
              );
              baseExercise.details.equipmentNames =
                stretchRecord.equipments.map((eq) => eq.group.name);
            }
          }

          return baseExercise;
        }
      );

      setRecordedExercises(existingExercises);
    }
  }, [records]);

  // 메모 설정
  useEffect(() => {
    if (lesson && lesson.memo) {
      setMemo(lesson.memo);
    }
  }, [lesson]);

  // 다음 entry 번호 계산
  const nextEntry = recordedExercises.length + 1;

  // 뒤로가기 네비게이션 핸들러
  const handleBackNavigation = () => {
    if (selectedType !== null) {
      // 운동 폼이 선택된 상태 -> 폼 취소하고 선택 화면으로
      setSelectedType(null);
    } else {
      // 운동 선택 화면 -> 이전 페이지로
      router.push(`/trainer/lesson/${id}`);
    }
  };

  // 운동 추가 완료 핸들러 - 즉시 서버에 저장
  const handleAddExercise = async (data: RecordedExerciseState) => {
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}`;
    const newExercise: RecordedExerciseState = {
      ...data,
      tempId,
      id: data.id || tempId,
      entry: nextEntry,
      saveStatus: "saving" as const,
    };

    // 즉시 UI에 추가 (optimistic update)
    setRecordedExercises((prev) => [...prev, newExercise]);
    setSelectedType(null);

    // 서버에 저장 (비동기)
    startTransition(async () => {
      try {
        // 데이터 변환 - API 형식에 맞게
        const recordData = {
          type: newExercise.type,
          title: newExercise.title,
          entry: newExercise.entry,
          description: newExercise.details?.description,
          tempId: newExercise.tempId,

          // 머신 운동 데이터
          ...(newExercise.type === "MACHINE" && {
            machineId: newExercise.details?.exerciseId,
            machineSetRecords: newExercise.details?.sets?.map(
              (set: any, idx: number) => ({
                set: idx + 1,
                reps: set.reps,
                settingValueIds:
                  set.settings?.map((s: any) => s.settingId) || [],
              })
            ),
          }),

          // 프리 운동 데이터
          ...(newExercise.type === "FREE" && {
            freeExerciseId: !newExercise.details?.isCustomExercise
              ? newExercise.details?.freeExerciseId
              : undefined,
            isCustomExercise: newExercise.details?.isCustomExercise,
            customExerciseName: newExercise.details?.customExerciseName,
            customExerciseDescription:
              newExercise.details?.customExerciseDescription,
            freeSetRecords: newExercise.details?.sets?.map(
              (set: any, idx: number) => ({
                set: idx + 1,
                reps: set.reps,
                equipmentIds: set.equipmentIds || [],
              })
            ),
          }),

          // 스트레칭 데이터
          ...(newExercise.type === "STRETCHING" && {
            stretchingExerciseId: !newExercise.details?.isCustomExercise
              ? newExercise.details?.exerciseId
              : undefined,
            isCustomExercise: newExercise.details?.isCustomExercise,
            customStretchingName: newExercise.details?.customExerciseName,
            customStretchingDescription:
              newExercise.details?.customExerciseDescription,
            stretchingDescription: newExercise.details?.stretchingDescription,
            stretchingEquipmentIds: newExercise.details?.equipmentIds || [],
          }),
        };

        const response = await fetch(`/api/trainer/lesson/${id}/records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordData),
        });

        if (!response.ok) {
          throw new Error("저장 실패");
        }

        const result = await response.json();

        // 성공 시 상태 업데이트
        setRecordedExercises((prev) =>
          prev.map((ex) =>
            ex.tempId === tempId
              ? { ...ex, dbId: result.data.id, saveStatus: "saved" as const }
              : ex
          )
        );

        // 레코드 목록 재요청
        mutateRecords();

        // 커스텀 운동 생성 시 운동 목록 재요청
        if (newExercise.details?.isCustomExercise) {
          if (newExercise.type === "FREE") {
            mutateFreeExercises(); // 프리 운동 목록 갱신
          } else if (newExercise.type === "STRETCHING") {
            mutateStretchingExercises(); // 스트레칭 운동 목록 갱신
          }
        }
      } catch (error) {
        console.error("운동 기록 저장 실패:", error);
        // 실패 시 에러 상태로 업데이트
        setRecordedExercises((prev) =>
          prev.map((ex) =>
            ex.tempId === tempId ? { ...ex, saveStatus: "error" as const } : ex
          )
        );
      }
    });
  };

  // 운동 삭제 핸들러 - 서버에서도 삭제
  const handleDeleteExercise = (id: string) => {
    const exercise = recordedExercises.find(
      (e) => e.id === id || e.tempId === id
    );
    if (!exercise) return;

    // 즉시 UI에서 제거 (optimistic update)
    const updated = recordedExercises.filter(
      (e) => e.id !== id && e.tempId !== id
    );
    // entry 번호 재정렬
    updated.forEach((exercise, idx) => {
      exercise.entry = idx + 1;
    });
    setRecordedExercises(updated);

    // DB에 저장된 경우 서버에서도 삭제
    if (exercise.saveStatus === "saved" && exercise.dbId) {
      startTransition(async () => {
        try {
          const response = await fetch(`/api/trainer/lesson/${id}/records`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recordId: exercise.dbId }),
          });

          if (!response.ok) {
            throw new Error("삭제 실패");
          }
          
          // 삭제 성공 시 레코드 목록 재요청
          mutateRecords();
        } catch (error) {
          console.error("운동 기록 삭제 실패:", error);
          // 실패 시 다시 추가 (rollback)
          setRecordedExercises((prev) => {
            const restored = [...prev, exercise];
            restored.sort((a, b) => a.entry - b.entry);
            return restored;
          });
        }
      });
    }
  };

  // 저장 핸들러 - 저장 상태 확인 후 메모만 업데이트
  const handleSave = async () => {
    if (recordedExercises.length === 0) return;

    // 아직 저장 중이거나 에러인 항목 확인
    const pendingItems = recordedExercises.filter(
      (ex) => ex.saveStatus === "saving" || ex.saveStatus === "error"
    );

    if (pendingItems.length > 0) {
      const savingCount = pendingItems.filter(
        (ex) => ex.saveStatus === "saving"
      ).length;
      const errorCount = pendingItems.filter(
        (ex) => ex.saveStatus === "error"
      ).length;

      if (savingCount > 0) {
        alert(
          `${savingCount}개 항목이 아직 저장 중입니다. 잠시 후 다시 시도해주세요.`
        );
        return;
      }

      if (errorCount > 0) {
        alert(
          `${errorCount}개 항목 저장에 실패했습니다. 페이지를 새로고침하거나 다시 시도해주세요.`
        );
        return;
      }
    }

    try {
      // 메모가 있으면 메모만 업데이트
      if (memo) {
        const response = await fetch(`/api/trainer/lesson/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memo }),
        });

        if (!response.ok) {
          console.error("메모 저장 실패");
        }
      }

      // 성공 시 레슨 상세 페이지로 이동
      router.push(`/trainer/lesson/${id}`);
    } catch (error) {
      console.error("완료 처리 실패:", error);
      alert("완료 처리에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 운동 타입별 정보
  const getExerciseTypeInfo = (type: string) => {
    switch (type) {
      case "MACHINE":
        return { icon: "🏋️", color: "blue", label: "머신" };
      case "FREE":
        return { icon: "💪", color: "green", label: "프리웨이트" };
      case "STRETCHING":
        return { icon: "🧘", color: "purple", label: "스트레칭" };
      default:
        return { icon: "🏃", color: "gray", label: "기타" };
    }
  };

  // 로딩 상태 - 레슨 정보와 레코드 정보 둘 다 체크
  if (lessonLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">레슨 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 권한이 없거나 레슨이 없는 경우
  if (lessonError || !lesson) {
    return <UnauthorizedAccess />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackNavigation}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">운동 기록</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConditionModalOpen(true)}
                className="text-sm text-blue-600 font-medium"
              >
                컨디션 기록
              </button>
              <button
                onClick={handleSave}
                disabled={
                  isPending ||
                  recordedExercises.length === 0 ||
                  recordedExercises.some((ex) => ex.saveStatus === "saving")
                }
                className="px-3 py-1.5 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors"
              >
                {isPending ? "처리 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 수업 정보 바 */}
      <div className="bg-white border-b px-3 py-2 lg:hidden">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">{lesson.memberName}</span>
            <Badge variant="info" className="text-xs">
              {lesson.lessonNumber}/{lesson.ptTotalCount}회차
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </span>
          </div>
        </div>
      </div>

      {/* 반응형 컨테이너 */}
      <div className="max-w-7xl mx-auto p-2 lg:p-6">
        {/* 태블릿/데스크탑 헤더 */}
        <div className="hidden lg:block mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackNavigation}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
              <h1 className="text-2xl font-bold">운동 기록 작성</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsConditionModalOpen(true)}
                variant="outline"
              >
                컨디션 기록
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isPending ||
                  recordedExercises.length === 0 ||
                  recordedExercises.some((ex) => ex.saveStatus === "saving")
                }
                variant="primary"
              >
                {isPending ? "처리 중..." : "기록 저장"}
              </Button>
            </div>
          </div>

          {/* 수업 정보 카드 */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{lesson.memberName}</span>
                  </div>
                  <Badge variant="info">
                    {lesson.lessonNumber}/{lesson.ptTotalCount}회차
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {lesson.ptTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(lesson.scheduleDate).toLocaleDateString()}{" "}
                    {formatTime(lesson.startTime)} -{" "}
                    {formatTime(lesson.endTime)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* 왼쪽: 기록된 운동 목록 */}
          <div className="lg:col-span-2 mb-3 lg:mb-0">
            {recordedExercises.length > 0 ? (
              <Card className="mb-3 lg:mb-4">
                <CardHeader className="p-3 lg:pb-3">
                  <h3 className="text-sm lg:text-base font-semibold">
                    기록된 운동 ({recordedExercises.length})
                  </h3>
                </CardHeader>
                <CardContent className="p-3 lg:p-6">
                  <div className="space-y-2">
                    {recordedExercises.map((exercise) => {
                      const typeInfo = getExerciseTypeInfo(exercise.type);
                      return (
                        <div
                          key={exercise.tempId || exercise.id}
                          className="p-2 lg:p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{typeInfo.icon}</span>
                                <span className="font-medium">
                                  {exercise.entry}. {exercise.title}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {typeInfo.label}
                                </Badge>
                                {/* 저장 상태 표시 */}
                                {exercise.saveStatus === "saving" && (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                )}
                                {exercise.saveStatus === "saved" && (
                                  <Check className="w-4 h-4 text-green-500" />
                                )}
                                {exercise.saveStatus === "error" && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {exercise.type === "MACHINE" && (
                                  <span>
                                    {exercise.details?.sets?.length || 0}세트
                                  </span>
                                )}
                                {exercise.type === "FREE" && (
                                  <span>
                                    {exercise.details?.sets?.length || 0}세트
                                  </span>
                                )}
                                {exercise.type === "STRETCHING" && (
                                  <span>
                                    {exercise.details?.duration || "완료"}
                                    {exercise.details?.equipmentNames &&
                                      exercise.details.equipmentNames.length >
                                        0 &&
                                      ` • ${exercise.details.equipmentNames.join(
                                        ", "
                                      )}`}
                                  </span>
                                )}
                                {exercise.details?.description && (
                                  <span className="ml-2 text-gray-500">
                                    • {exercise.details.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingRecord(exercise);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                disabled={exercise.saveStatus === "saving"}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-3 lg:mb-4">
                <CardContent className="py-6 lg:py-8">
                  <div className="text-center text-gray-500">
                    <p className="text-base lg:text-lg mb-2">
                      아직 기록된 운동이 없습니다
                    </p>
                    <p className="text-sm">운동을 추가해주세요</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 모바일/태블릿에서 운동 추가 영역 */}
            <div className="lg:hidden">
              {selectedType === null ? (
                <Card>
                  <CardHeader className="p-3">
                    <h3 className="text-sm font-semibold">운동 추가</h3>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedType("MACHINE")}
                        className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-xl mb-1">🏋️</div>
                          <div className="text-xs font-medium">머신</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedType("FREE")}
                        className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-xl mb-1">💪</div>
                          <div className="text-xs font-medium">프리웨이트</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedType("STRETCHING")}
                        className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-xl mb-1">🧘</div>
                          <div className="text-xs font-medium">스트레칭</div>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="p-3">
                    <h3 className="text-sm font-semibold">
                      {selectedType === "MACHINE" && "머신 운동 추가"}
                      {selectedType === "FREE" && "프리웨이트 추가"}
                      {selectedType === "STRETCHING" && "스트레칭 추가"}
                    </h3>
                  </CardHeader>
                  <CardContent className="p-3">
                    {selectedType === "MACHINE" && (
                      <MachineRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        centerId={lesson?.centerId}
                        preloadedMachines={preloadedMachines}
                        isLoading={isMachinesLoading}
                      />
                    )}
                    {selectedType === "FREE" && (
                      <FreeRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedFreeExercises}
                        preloadedEquipments={preloadedEquipments}
                        isExercisesLoading={isFreeExercisesLoading}
                        isEquipmentsLoading={isEquipmentsLoading}
                      />
                    )}
                    {selectedType === "STRETCHING" && (
                      <StretchingRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedStretchingExercises}
                        preloadedEquipments={preloadedEquipments}
                        isExercisesLoading={isStretchingExercisesLoading}
                        isEquipmentsLoading={isEquipmentsLoading}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 오른쪽: 운동 추가 패널 (데스크탑) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              {selectedType === null ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">운동 추가</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectedType("MACHINE")}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🏋️</div>
                          <div>
                            <div className="font-medium">머신 운동</div>
                            <div className="text-xs text-gray-500">
                              머신을 사용한 운동
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedType("FREE")}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">💪</div>
                          <div>
                            <div className="font-medium">프리웨이트</div>
                            <div className="text-xs text-gray-500">
                              덤벨, 바벨 등을 사용한 운동
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedType("STRETCHING")}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🧘</div>
                          <div>
                            <div className="font-medium">스트레칭</div>
                            <div className="text-xs text-gray-500">
                              유연성 및 이완 운동
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">
                      {selectedType === "MACHINE" && "머신 운동 추가"}
                      {selectedType === "FREE" && "프리웨이트 추가"}
                      {selectedType === "STRETCHING" && "스트레칭 추가"}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {selectedType === "MACHINE" && (
                      <MachineRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        centerId={lesson?.centerId}
                        preloadedMachines={preloadedMachines}
                        isLoading={isMachinesLoading}
                      />
                    )}
                    {selectedType === "FREE" && (
                      <FreeRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedFreeExercises}
                        preloadedEquipments={preloadedEquipments}
                        isExercisesLoading={isFreeExercisesLoading}
                        isEquipmentsLoading={isEquipmentsLoading}
                      />
                    )}
                    {selectedType === "STRETCHING" && (
                      <StretchingRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedStretchingExercises}
                        preloadedEquipments={preloadedEquipments}
                        isExercisesLoading={isStretchingExercisesLoading}
                        isEquipmentsLoading={isEquipmentsLoading}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* 메모 입력 영역 - 운동 기록 중이 아닐 때만 표시 */}
        {selectedType === null && (
          <div className="mt-4 bg-white border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              트레이너 메모 (선택사항)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘 수업에 대한 메모를 남겨주세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              rows={3}
            />
          </div>
        )}

        {/* 하단 여백 - 탭바 공간 확보 */}
        <div className="h-20 lg:h-0"></div>
      </div>

      {/* 운동 기록 수정 모달 */}
      <EditRecordModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        record={editingRecord}
        lessonId={id}
        onSuccess={(updatedRecord?: RecordedExerciseState) => {
          if (updatedRecord && editingRecord) {
            // 수정된 기록으로 업데이트
            setRecordedExercises((prev) =>
              prev.map((ex) =>
                ex.id === editingRecord.id ? updatedRecord : ex
              )
            );
          } else if (editingRecord) {
            // 삭제된 경우 목록에서 제거
            setRecordedExercises((prev) =>
              prev.filter((ex) => ex.id !== editingRecord.id)
            );
          }
          // 수정 또는 삭제 후 레코드 목록 재요청
          mutateRecords();
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
      />

      {/* 통합 컨디션 모달 */}
      <EnhancedConditionModal
        isOpen={isConditionModalOpen}
        onClose={() => setIsConditionModalOpen(false)}
        lessonId={id}
        onSuccess={() => {
          // 컨디션 데이터 갱신
          mutateCondition();
          setIsConditionModalOpen(false);
        }}
      />
    </div>
  );
}
