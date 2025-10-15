"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { GetStretchingExerciseDetailResult } from "@/app/services/exercise/exercise.service";
import { MediaThumbnails } from "@/app/components/media/MediaThumbnails";
import { MediaItem } from "@/app/components/media/FullscreenMediaViewer";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import { ArrowLeft, Edit2, Plus, Save } from "lucide-react";
import ImageUploadModal from "@/app/components/media/ImageUploadModal";
import VideoUploadModal from "@/app/components/media/VideoUploadModal";

type Params = Promise<{ id: string }>;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StretchingExerciseDetailPage({
  params,
}: {
  params: Params;
}) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState<string>("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    params.then((p) => setExerciseId(p.id));
  }, [params]);

  const {
    data: exercise,
    error,
    mutate,
  } = useSWR<GetStretchingExerciseDetailResult>(
    exerciseId ? `/api/exercises/stretching/${exerciseId}` : null,
    fetcher
  );

  // exercise가 로드되면 editedDescription 초기화
  useEffect(() => {
    if (exercise?.description) {
      setEditedDescription(exercise.description);
    }
  }, [exercise]);

  const handleEditClick = () => {
    setIsEditingDescription(true);
    setEditedDescription(exercise?.description || "");
  };

  const handleCancelEdit = () => {
    setIsEditingDescription(false);
    setEditedDescription(exercise?.description || "");
  };

  const handleSaveDescription = async () => {
    if (!exerciseId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/exercises/stretching/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });

      if (!response.ok) {
        throw new Error("Failed to update description");
      }

      await mutate();
      setIsEditingDescription(false);
      alert("설명이 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("Failed to save description:", error);
      alert("설명 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-error text-lg mb-4">
            운동 정보를 불러오는데 실패했습니다.
          </p>
          <button onClick={() => router.back()} className="btn btn-outline">
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // MediaThumbnails에 전달할 미디어 아이템 생성
  const mediaItems: MediaItem[] = [
    ...exercise.images.map((img) => ({
      id: img.id,
      cloudflareId: img.cloudflareId,
      thumbnailUrl: `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${img.cloudflareId}/thumbnail`,
      isPrimary: img.isPrimary,
    })),
    ...exercise.videos.map((vid) => ({
      id: vid.id,
      streamId: vid.streamId,
    })),
  ];

  return (
    <div className="h-full overflow-auto bg-base-200">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="btn btn-ghost gap-2">
            <ArrowLeft className="w-5 h-5" />
            목록으로 돌아가기
          </button>
        </div>

        <div className="space-y-6">
          {/* 제목 카드 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-secondary mb-3">
                    {exercise.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60">등록일:</span>
                      <span className="font-medium">
                        {new Date(exercise.createdAt).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="divider divider-horizontal"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60">레슨 횟수:</span>
                      <span className="text-2xl font-bold text-secondary">
                        {exercise._count.stretchingExerciseRecord}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="badge badge-lg badge-outline badge-secondary">
                  스트레칭
                </div>
              </div>
            </div>
          </div>

          {/* 설명 카드 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">설명</h3>
                {!isEditingDescription ? (
                  <button
                    onClick={handleEditClick}
                    className="btn btn-sm btn-primary gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    수정하기
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="btn btn-sm btn-ghost gap-2"
                      disabled={isSaving}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className="btn btn-sm btn-success gap-2"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          저장하기
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isEditingDescription ? (
                <div className="prose max-w-none">
                  <p className="text-base-content whitespace-pre-wrap leading-relaxed">
                    {exercise.description || "설명이 없습니다."}
                  </p>
                </div>
              ) : (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="textarea textarea-bordered w-full h-48 text-base leading-relaxed"
                  placeholder="운동에 대한 설명을 입력하세요..."
                />
              )}
            </div>
          </div>

          {/* 미디어 섹션 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="text-xl font-semibold mb-4">미디어</h3>

              {/* Upload Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  disabled={exercise.images.length >= 5}
                  className="btn btn-outline btn-primary gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">이미지 추가</div>
                    <div className="text-xs opacity-70">
                      {exercise.images.length}/5
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="btn btn-outline btn-secondary gap-2"
                  disabled={exercise.videos.length >= 3}
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">비디오 추가</div>
                    <div className="text-xs opacity-70">
                      {exercise.videos.length}/3
                    </div>
                  </div>
                </button>
              </div>

              {/* 미디어 썸네일 */}
              {mediaItems.length > 0 ? (
                <MediaThumbnails
                  mediaItems={mediaItems}
                  canEdit={true}
                  mediaMutate={mutate}
                />
              ) : (
                <div className="text-center py-12 text-base-content/50">
                  <p className="text-lg">등록된 미디어가 없습니다</p>
                  <p className="text-sm mt-2">
                    위 버튼을 클릭하여 이미지나 비디오를 추가하세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        entityType="STRETCHING"
        entityId={exerciseId}
        onUploadComplete={() => mutate()}
        title="스트레칭 이미지 추가"
        maxImages={5 - (exercise.images.length || 0)}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        entityType="STRETCHING"
        entityId={exerciseId}
        onUploadComplete={() => mutate()}
        title="스트레칭 영상 추가"
        maxVideos={3 - (exercise.videos.length || 0)}
        maxDurationSeconds={600}
      />
    </div>
  );
}
