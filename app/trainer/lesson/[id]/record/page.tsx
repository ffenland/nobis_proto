// app/trainer/lesson/[id]/record/page.tsx
"use client";
// Lesson을 기록, 수정하는 페이지. 트레이너가 보는 곳이므로 운동에 대한 자세한 설명은 필요없다.
import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import {
  ChevronLeft,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Camera,
  Video,
  Play,
} from "lucide-react";
import Image from "next/image";
import { formatTime } from "@/app/lib/utils/time.utils";
import MachineRecordForm from "./MachineRecordForm";
import FreeRecordForm from "./FreeRecordForm";
import StretchingRecordForm from "./StretchingRecordForm";
import EditRecordModal from "../EditRecordModal";
import EnhancedConditionModal from "./EnhancedConditionModal";
import ExerciseRecordDisplay from "./ExerciseRecordDisplay";
import LessonImageUploadModal from "./LessonImageUploadModal";
import LessonVideoUploadModal from "./LessonVideoUploadModal";
import LessonMediaViewer from "./LessonMediaViewer";
import type {
  GetLessonDetailResult,
  LessonDetailRecord,
  CreateRecordInput,
  CreateMachineRecordInput,
  CreateFreeRecordInput,
  CreateStretchingRecordInput,
} from "@/app/services/trainer/lesson.service";
import type {
  GetFreeExercisesResult,
  GetStretchingExercisesResult,
} from "@/app/services/exercise/exercise.service";
import type { GetCenterEquipmentsResult } from "@/app/services/fitness-center/equipment.service";
import { getCloudflareStreamThumbnailUrl } from "@/app/services/media/media.service";
import type { IMachinesByFitnessCenter } from "@/app/services/fitness-center/machine.service";
import UnauthorizedAccess from "../UnauthorizedAccess";
import {
  ListImagesByEntityResult,
  ListVideosByEntityResult,
} from "@/app/services/media/media.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 임시 저장 상태를 나타내는 타입
interface TempRecordState {
  tempId: string;
  type: "MACHINE" | "FREE" | "STRETCHING";
  title: string;
  entry: number;
  saveStatus: "saving" | "error";
}

// Form에서 반환하는 데이터 타입 (서비스 레이어 타입에서 entry, tempId 제외)
type ExerciseFormData =
  | Omit<CreateMachineRecordInput, "entry" | "tempId">
  | Omit<CreateFreeRecordInput, "entry" | "tempId">
  | Omit<CreateStretchingRecordInput, "entry" | "tempId">;

export default function NewRecordPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<
    "MACHINE" | "FREE" | "STRETCHING" | null
  >(null);
  const [tempRecords, setTempRecords] = useState<TempRecordState[]>([]);
  const [editingRecord, setEditingRecord] = useState<LessonDetailRecord | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [isVideoUploadModalOpen, setIsVideoUploadModalOpen] = useState(false);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

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
  const { mutate: mutateCondition } = useSWR(
    lesson ? `/api/trainer/lesson/${id}/condition` : null,
    {
      shouldRetryOnError: false, // 404 에러 시 재시도 안함
      revalidateOnFocus: false,
    }
  );

  // 미디어 목록 조회 (기존 API 재활용)
  const { data: mediaData, mutate: mutateMedia } = useSWR<{
    imageList: ListImagesByEntityResult;
    videoList: ListVideosByEntityResult;
  }>(lesson ? `/api/media/list?entityType=LESSON&entityId=${id}` : null);

  // 프리로딩을 위한 SWR 요청들 - 페이지 로딩 시 즉시 모든 데이터 로드
  const { data: preloadedFreeExercises, mutate: mutateFreeExercises } =
    useSWR<GetFreeExercisesResult>("/api/exercises/free");

  const {
    data: preloadedStretchingExercises,
    mutate: mutateStretchingExercises,
  } = useSWR<GetStretchingExercisesResult>("/api/exercises/stretching");

  const { data: equipmentsData } = useSWR<GetCenterEquipmentsResult>(
    lesson?.centerId
      ? `/api/fitness-center/${lesson.centerId}/equipments`
      : null
  );

  const preloadedEquipments = equipmentsData?.equipments ?? [];

  const { data: preloadedMachines } = useSWR<IMachinesByFitnessCenter[]>(
    lesson?.centerId ? `/api/fitness-center/${lesson.centerId}/machines` : null
  );

  // 다음 entry 번호 계산
  const nextEntry = (records?.length || 0) + tempRecords.length + 1;

  // 미디어 삭제 핸들러 (뷰어에서 사용)
  const handleDeleteMedia = async (
    mediaId: string,
    mediaType: "image" | "video"
  ) => {
    try {
      const response = await fetch(
        `/api/media/${mediaType === "image" ? "images" : "videos"}/${mediaId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      // 미디어 목록 갱신
      mutateMedia();
    } catch (error) {
      console.error("미디어 삭제 실패:", error);
      alert("미디어 삭제 중 오류가 발생했습니다.");
      throw error; // 뷰어에서 에러 처리할 수 있도록
    }
  };

  // 미디어 썸네일 클릭 핸들러
  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setIsMediaViewerOpen(true);
  };

  // 운동 추가 완료 핸들러
  const handleAddExercise = async (formData: ExerciseFormData) => {
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    // 임시 상태 추가
    const tempRecord: TempRecordState = {
      tempId,
      type: formData.type,
      title: formData.title,
      entry: nextEntry,
      saveStatus: "saving",
    };

    setTempRecords((prev) => [...prev, tempRecord]);
    setSelectedType(null);

    // 서버에 저장
    startTransition(async () => {
      try {
        // formData를 CreateRecordInput 형식으로 변환
        let createRecordInput: CreateRecordInput;

        // 운동 타입별로 데이터 구성
        if (formData.type === "MACHINE") {
          const machineData = formData as Omit<
            CreateMachineRecordInput,
            "entry" | "tempId"
          >;
          createRecordInput = {
            ...machineData,
            entry: nextEntry,
            tempId,
          } as CreateMachineRecordInput;
        } else if (formData.type === "FREE") {
          const freeData = formData as Omit<
            CreateFreeRecordInput,
            "entry" | "tempId"
          >;
          createRecordInput = {
            ...freeData,
            entry: nextEntry,
            tempId,
          } as CreateFreeRecordInput;
        } else {
          // STRETCHING
          const stretchingData = formData as Omit<
            CreateStretchingRecordInput,
            "entry" | "tempId"
          >;
          createRecordInput = {
            ...stretchingData,
            entry: nextEntry,
            tempId,
          } as CreateStretchingRecordInput;
        }

        const response = await fetch(`/api/trainer/lesson/${id}/records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createRecordInput),
        });

        if (!response.ok) {
          throw new Error("저장 실패");
        }

        // 성공 시 임시 상태 제거하고 실제 데이터 다시 로드
        setTempRecords((prev) => prev.filter((t) => t.tempId !== tempId));
        mutateRecords(); // SWR로 실제 데이터 재요청

        // 커스텀 운동인 경우 운동 목록도 갱신
        if (formData.type === "FREE" && formData.isCustomExercise) {
          mutateFreeExercises();
        } else if (
          formData.type === "STRETCHING" &&
          formData.isCustomExercise
        ) {
          mutateStretchingExercises();
        }
      } catch (error) {
        console.error("운동 기록 저장 실패:", error);
        // 실패 시 에러 상태로 변경
        setTempRecords((prev) =>
          prev.map((t) =>
            t.tempId === tempId ? { ...t, saveStatus: "error" as const } : t
          )
        );
      }
    });
  };

  // 운동 삭제 핸들러
  const handleDeleteExercise = (record: LessonDetailRecord) => {
    if (!record.id) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/trainer/lesson/${id}/records`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id }),
        });

        if (!response.ok) {
          throw new Error("삭제 실패");
        }

        mutateRecords(); // 데이터 다시 로드
      } catch (error) {
        console.error("운동 기록 삭제 실패:", error);
      }
    });
  };

  // 뒤로 가기 핸들러
  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      router.push(`/trainer/lesson/${id}`);
    }
  };

  // 로딩 상태
  if (lessonLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // 에러 상태
  if (lessonError || recordsError) {
    return <UnauthorizedAccess />;
  }

  // 레슨 정보가 없는 경우
  if (!lesson) {
    return <UnauthorizedAccess />;
  }

  return (
    <div className="min-h-0 flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">운동 기록</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{lesson.memberName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(lesson.startTime)} -{" "}
                      {formatTime(lesson.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsConditionModalOpen(true)}
              >
                컨디션 기록
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 왼쪽: 기록된 운동 목록 */}
          <div className="lg:col-span-2">
            {/* 모바일: 운동 추가 버튼 */}
            <div className="lg:hidden mb-4">
              {selectedType === null ? (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">운동 추가</h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      onClick={() => setSelectedType("MACHINE")}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">💪</div>
                        <div>
                          <div className="font-medium">머신 운동</div>
                          <div className="text-sm text-gray-600">
                            머신을 사용한 운동을 기록합니다
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedType("FREE")}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🏋️</div>
                        <div>
                          <div className="font-medium">프리 운동</div>
                          <div className="text-sm text-gray-600">
                            덤벨, 바벨 등을 사용한 운동을 기록합니다
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
                          <div className="text-sm text-gray-600">
                            스트레칭 및 정적 운동을 기록합니다
                          </div>
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">
                      {selectedType === "MACHINE" && "💪 머신 운동 기록"}
                      {selectedType === "FREE" && "🏋️ 프리 운동 기록"}
                      {selectedType === "STRETCHING" && "🧘 스트레칭 기록"}
                    </h3>
                  </CardHeader>
                  <CardContent className="p-3">
                    {selectedType === "MACHINE" && (
                      <MachineRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        centerId={lesson.centerId}
                        preloadedMachines={preloadedMachines || []}
                      />
                    )}
                    {selectedType === "FREE" && (
                      <FreeRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedFreeExercises || []}
                        preloadedEquipments={preloadedEquipments || []}
                      />
                    )}
                    {selectedType === "STRETCHING" && (
                      <StretchingRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedStretchingExercises || []}
                        preloadedEquipments={preloadedEquipments || []}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 미디어 업로드 섹션 */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold">운동 사진 및 영상</h3>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="space-y-4">
                  {/* 미디어 요약 정보 */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      사진 {mediaData?.imageList.length || 0}/10 • 영상{" "}
                      {mediaData?.videoList.length || 0}/4
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsImageUploadModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        사진 추가하기
                      </Button>
                      <Button
                        onClick={() => setIsVideoUploadModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        영상 추가하기
                      </Button>
                    </div>
                  </div>

                  {/* 미디어 썸네일 그리드 */}
                  {(mediaData?.imageList.length || 0) +
                    (mediaData?.videoList.length || 0) >
                  0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {/* 이미지 먼저 표시 */}
                      {mediaData?.imageList.map((img, index) => (
                        <button
                          key={img.id}
                          onClick={() => handleMediaClick(index)}
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity relative group"
                        >
                          <Image
                            src={img.thumbnailUrl}
                            alt="이미지"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                          {/* 미디어 타입 배지 */}
                          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                            <Camera className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                      {/* 비디오 나중에 표시 */}
                      {mediaData?.videoList.map((vid, index) => (
                        <button
                          key={vid.id}
                          onClick={() =>
                            handleMediaClick(
                              (mediaData?.imageList.length || 0) + index
                            )
                          }
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity relative group"
                        >
                          <Image
                            src={getCloudflareStreamThumbnailUrl(vid.streamId)}
                            alt="비디오"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                          {/* 미디어 타입 배지 */}
                          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                            <Video className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <div className="mb-2">📷</div>
                      <div>아직 업로드된 미디어가 없습니다</div>
                      <div className="text-xs mt-1">
                        위 버튼을 눌러 사진이나 영상을 추가해보세요
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 기록된 운동 목록 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">
                  기록된 운동 ({(records?.length || 0) + tempRecords.length})
                </h3>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="space-y-3">
                  {/* 실제 저장된 기록들 */}
                  {records?.map((record) => (
                    <ExerciseRecordDisplay
                      key={record.id}
                      record={record}
                      onEdit={(record) => {
                        setEditingRecord(record);
                        setIsEditModalOpen(true);
                      }}
                      onDelete={handleDeleteExercise}
                      showActions={true}
                    />
                  ))}

                  {/* 임시 저장 중인 기록들 */}
                  {tempRecords.map((temp) => (
                    <div
                      key={temp.tempId}
                      className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="font-medium">
                          {temp.entry}. {temp.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          저장 중...
                        </Badge>
                        {temp.saveStatus === "error" && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 기록이 없는 경우 */}
                  {records?.length === 0 && tempRecords.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>아직 기록된 운동이 없습니다.</p>
                      <p className="text-sm mt-1">
                        오른쪽에서 운동을 추가해보세요.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                          <div className="text-2xl">💪</div>
                          <div>
                            <div className="font-medium">머신 운동</div>
                            <div className="text-sm text-gray-600">
                              머신을 사용한 운동을 기록합니다
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedType("FREE")}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🏋️</div>
                          <div>
                            <div className="font-medium">프리 운동</div>
                            <div className="text-sm text-gray-600">
                              덤벨, 바벨 등을 사용한 운동을 기록합니다
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
                            <div className="text-sm text-gray-600">
                              스트레칭 및 정적 운동을 기록합니다
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
                      {selectedType === "MACHINE" && "💪 머신 운동 기록"}
                      {selectedType === "FREE" && "🏋️ 프리 운동 기록"}
                      {selectedType === "STRETCHING" && "🧘 스트레칭 기록"}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {selectedType === "MACHINE" && (
                      <MachineRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        centerId={lesson.centerId}
                        preloadedMachines={preloadedMachines || []}
                      />
                    )}
                    {selectedType === "FREE" && (
                      <FreeRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedFreeExercises || []}
                        preloadedEquipments={preloadedEquipments || []}
                      />
                    )}
                    {selectedType === "STRETCHING" && (
                      <StretchingRecordForm
                        onComplete={handleAddExercise}
                        onCancel={() => setSelectedType(null)}
                        nextEntry={nextEntry}
                        preloadedExercises={preloadedStretchingExercises || []}
                        preloadedEquipments={preloadedEquipments || []}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      {editingRecord && (
        <EditRecordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
          record={editingRecord}
          lessonId={id}
          onSuccess={() => {
            mutateRecords();
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
        />
      )}

      {/* 컨디션 기록 모달 */}
      <EnhancedConditionModal
        isOpen={isConditionModalOpen}
        onClose={() => setIsConditionModalOpen(false)}
        lessonId={id}
        onSuccess={() => {
          mutateCondition();
        }}
      />

      {/* 이미지 업로드 모달 */}
      <LessonImageUploadModal
        isOpen={isImageUploadModalOpen}
        onClose={() => setIsImageUploadModalOpen(false)}
        lessonId={id}
        onUploadComplete={() => {
          mutateMedia(); // 미디어 목록 재조회
        }}
      />

      {/* 비디오 업로드 모달 */}
      <LessonVideoUploadModal
        isOpen={isVideoUploadModalOpen}
        onClose={() => setIsVideoUploadModalOpen(false)}
        lessonId={id}
        onUploadComplete={() => {
          mutateMedia(); // 미디어 목록 재조회
        }}
      />

      {/* 미디어 뷰어 모달 */}
      <LessonMediaViewer
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        mediaData={mediaData}
        initialIndex={selectedMediaIndex}
        onDelete={handleDeleteMedia}
      />
    </div>
  );
}
