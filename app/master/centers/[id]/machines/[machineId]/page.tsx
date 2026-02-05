"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { ArrowLeft, Trash2, X, Plus } from "lucide-react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { GetMachineByIdResult } from "@/app/services/fitness-center/machine.service";
import FullscreenMediaViewer, {
  type MediaItem,
} from "@/app/components/media/FullscreenMediaViewer";
import ImageUploadModal from "@/app/components/media/ImageUploadModal";
import VideoUploadModal from "@/app/components/media/VideoUploadModal";
import { getCloudflareStreamThumbnailUrl } from "@/app/services/media/media.service";

type Params = Promise<{ id: string; machineId: string }>;

// Fetcher functions
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const deleteMachineFetcher = async (url: string) => {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete machine");
  }
  return response.json();
};

const deleteMediaRequest = async (
  mediaId: string,
  mediaType: "image" | "video"
) => {
  const response = await fetch(
    `/api/media/${mediaType === "image" ? "images" : "videos"}/${mediaId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete media");
  }
  return response.json();
};

export default function MachineDetailPage({ params }: { params: Params }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Get params
  useEffect(() => {
    params.then((p) => {
      setCenterId(p.id);
      setMachineId(p.machineId);
    });
  }, [params]);

  // Fetch machine data
  const { data: machine, mutate } = useSWR<GetMachineByIdResult>(
    machineId ? `/api/machines/${machineId}` : null,
    fetcher
  );

  // Delete machine mutation
  const { trigger: deleteMachine, isMutating: isDeleting } = useSWRMutation(
    machineId ? `/api/machines/${machineId}` : null,
    deleteMachineFetcher,
    {
      populateCache: false, // 캐시 업데이트 비활성화
      revalidate: false, // mutation 후 revalidation 비활성화
    }
  );

  // Handle machine deletion
  const handleDelete = async () => {
    try {
      await deleteMachine();
      alert("머신이 성공적으로 삭제되었습니다.");
      router.push(`/manager/centers/${centerId}/machines`);
    } catch (error: any) {
      console.error("Failed to delete machine:", error);
      alert(error.message || "머신 삭제에 실패했습니다.");
    }
  };

  // 미디어 뷰어용 데이터 변환
  const allMediaItems: MediaItem[] = [
    ...(machine?.images?.map((img) => ({
      id: img.id,
      cloudflareId: img.cloudflareId,
      thumbnailUrl: getOptimizedImageUrl(img.cloudflareId, "thumbnail"),
      isPrimary: img.isPrimary,
    })) || []),
    ...(machine?.videos?.map((vid) => ({
      id: vid.id,
      streamId: vid.streamId,
    })) || []),
  ];

  // 미디어 클릭 핸들러
  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setIsMediaViewerOpen(true);
  };

  // 미디어 삭제 핸들러 (뷰어에서 사용)
  const handleDeleteMedia = async (
    mediaId: string,
    mediaType: "image" | "video"
  ) => {
    try {
      await deleteMediaRequest(mediaId, mediaType);
      // 머신 데이터 갱신
      mutate();
    } catch (error) {
      console.error("미디어 삭제 실패:", error);
      alert("미디어 삭제 중 오류가 발생했습니다.");
      throw error; // 뷰어에서 에러 처리할 수 있도록
    }
  };

  // 개별 썸네일 삭제 핸들러
  const handleThumbnailDelete = async (
    mediaId: string,
    mediaType: "image" | "video"
  ) => {
    if (
      !confirm(
        `이 ${mediaType === "image" ? "이미지" : "비디오"}를 삭제하시겠습니까?`
      )
    )
      return;

    try {
      await deleteMediaRequest(mediaId, mediaType);
      mutate();
      alert(
        `${
          mediaType === "image" ? "이미지" : "비디오"
        }가 성공적으로 삭제되었습니다.`
      );
    } catch (error: any) {
      console.error("미디어 삭제 실패:", error);
      alert(error.message || "미디어 삭제에 실패했습니다.");
    }
  };

  if (!machine) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  const canAddImages = (machine.images?.length || 0) < 3;

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">{machine.title}</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          머신 삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Machine Info */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">머신 정보</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600">머신명:</span>
                  <span className="ml-2">{machine.title}</span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">브랜드:</span>
                  <span className="ml-2">{machine.brand.name}</span>
                </div>

                {machine.model && (
                  <div>
                    <span className="font-medium text-gray-600">모델:</span>
                    <span className="ml-2">{machine.model}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-600">설명:</span>
                  <p className="ml-2 text-gray-700 whitespace-pre-wrap">
                    {machine.description}
                  </p>
                </div>

                {machine.musclesUsed && (
                  <div>
                    <span className="font-medium text-gray-600">
                      사용 근육:
                    </span>
                    <span className="ml-2">{machine.musclesUsed}</span>
                  </div>
                )}

                {machine.spec && (
                  <div>
                    <span className="font-medium text-gray-600">제원:</span>
                    <p className="ml-2 text-gray-700 whitespace-pre-wrap">
                      {machine.spec}
                    </p>
                  </div>
                )}

                {/* Machine Settings */}
                {machine.machineSetting &&
                  machine.machineSetting.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-600 block mb-2">
                        설정 항목:
                      </span>
                      <div className="space-y-2">
                        {machine.machineSetting.map((setting) => (
                          <div
                            key={setting.id}
                            className="bg-gray-50 p-4 rounded"
                          >
                            <div className="font-medium text-base mb-2">
                              {setting.title} ({setting.unit})
                            </div>
                            {setting.values && setting.values.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {setting.values
                                  .slice()
                                  .sort((a, b) => {
                                    const aNum = parseFloat(a.value);
                                    const bNum = parseFloat(b.value);

                                    // 둘 다 숫자인 경우 숫자로 비교
                                    if (!isNaN(aNum) && !isNaN(bNum)) {
                                      return aNum - bNum;
                                    }

                                    // 그 외에는 문자열로 비교
                                    return a.value.localeCompare(b.value);
                                  })
                                  .map((value) => (
                                    <span
                                      key={value.id}
                                      className="badge badge-outline px-3 py-2 text-sm"
                                    >
                                      {value.value}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Section */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">미디어</h2>
                <div className="text-sm font-bold flex items-center gap-4">
                  <span>이미지: {machine.images.length || 0}/3</span>
                  <span>
                    비디오:
                    {machine.videos.length || 0}/2
                  </span>
                </div>
              </div>

              {/* Unified Media Thumbnails (64x64) */}
              {allMediaItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {machine.images?.map((image, index) => (
                    <div key={`img-${image.id}`} className="relative group">
                      <button
                        onClick={() => handleMediaClick(index)}
                        className="block"
                      >
                        <Image
                          src={getOptimizedImageUrl(
                            image.cloudflareId,
                            "thumbnail"
                          )}
                          alt="Machine"
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        />
                      </button>
                      {/* 대표 이미지 배지 */}
                      {image.isPrimary && (
                        <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                          대표
                        </div>
                      )}
                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => handleThumbnailDelete(image.id, "image")}
                        className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {machine.videos?.map((video, index) => (
                    <div key={`vid-${video.id}`} className="relative group">
                      <button
                        onClick={() =>
                          handleMediaClick(
                            (machine.images?.length || 0) + index
                          )
                        }
                        className="block"
                      >
                        <Image
                          src={getCloudflareStreamThumbnailUrl(video.streamId)}
                          alt="비디오 썸네일"
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                          unoptimized
                          onError={(e) => {
                            console.error("비디오 썸네일 로드 실패:", e);
                          }}
                        />
                      </button>
                      <button
                        onClick={() => handleThumbnailDelete(video.id, "video")}
                        className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  disabled={!canAddImages}
                  className="flex-1 btn btn-sm btn-outline gap-2"
                >
                  <Plus className="w-4 h-4" />
                  이미지 추가
                  {!canAddImages && " (최대)"}
                </button>
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="flex-1 btn btn-sm btn-outline gap-2"
                >
                  <Plus className="w-4 h-4" />
                  비디오 추가
                </button>
              </div>

              {!canAddImages && (
                <p className="text-xs text-gray-500 mt-2">
                  이미지는 최대 3개까지만 추가할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">머신 삭제 확인</h3>
            <p className="mb-6">
              <strong>{machine.title}</strong>를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-gray-600">
                이 작업은 되돌릴 수 없으며, 관련된 모든 미디어도 함께
                삭제됩니다.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="btn btn-error flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "삭제"
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost"
                disabled={isDeleting}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      <FullscreenMediaViewer
        isOpen={isMediaViewerOpen}
        onClose={() => {
          setIsMediaViewerOpen(false);
          mutate(); // 모달 닫을 때 데이터 갱신
        }}
        mediaItems={allMediaItems}
        initialIndex={selectedMediaIndex}
        onDelete={handleDeleteMedia}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        entityType="MACHINE"
        entityId={machineId}
        onUploadComplete={() => mutate()}
        title="머신 이미지 추가"
        maxImages={3 - (machine.images.length || 0)}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        entityType="MACHINE"
        entityId={machineId}
        onUploadComplete={() => mutate()}
        title="머신 영상 추가"
        maxVideos={2 - (machine.videos.length || 0)}
        maxDurationSeconds={600}
      />
    </div>
  );
}
