"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { X, ZoomIn, ZoomOut, RotateCcw, Trash2 } from "lucide-react";

interface ConditionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  onDelete?: () => void;
}

interface ConditionImage {
  id: string;
  cloudflareId: string;
  originalName: string;
  createdAt: string;
}

interface ConditionData {
  id: string;
  conditionMemo: string | null;
  conditionRecordedAt: string | null;
  conditionImages: ConditionImage[];
  scheduledAt: string;
  endAt: string | null;
  pt: {
    member: {
      user: {
        username: string;
      };
    };
  };
}

// Cloudflare Images URL 생성 함수
function getCloudflareImageUrl(cloudflareId: string, variant = "public"): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL;
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `${baseUrl}/${accountHash}/${cloudflareId}/${variant}`;
}

export default function ConditionViewModal({
  isOpen,
  onClose,
  lessonId,
  onDelete,
}: ConditionViewModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 컨디션 데이터 조회
  const { data: condition, error, mutate } = useSWR<ConditionData>(
    isOpen ? `/api/trainer/lesson/${lessonId}/condition` : null,
    {
      revalidateOnFocus: false,
    }
  );

  // 컨디션 삭제 함수
  const handleDelete = async () => {
    if (!confirm("컨디션 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/trainer/lesson/${lessonId}/condition`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      alert("컨디션 기록이 삭제되었습니다.");
      onDelete?.();
      onClose();
    } catch (error) {
      console.error("Delete condition error:", error);
      alert("삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 이미지 모달 닫기
  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  // 이미지 네비게이션
  const goToPrevImage = () => {
    if (selectedImageIndex !== null && condition?.conditionImages) {
      setSelectedImageIndex(
        selectedImageIndex > 0 ? selectedImageIndex - 1 : condition.conditionImages.length - 1
      );
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && condition?.conditionImages) {
      setSelectedImageIndex(
        selectedImageIndex < condition.conditionImages.length - 1 ? selectedImageIndex + 1 : 0
      );
    }
  };

  if (!isOpen) return null;

  // 로딩 상태
  if (!condition && !error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="bg-white w-full h-full p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">컨디션 기록 조회</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">컨디션 기록을 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="bg-white w-full h-full p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">컨디션 기록 조회</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">컨디션 기록을 불러올 수 없습니다.</p>
            <Button onClick={() => mutate()} variant="outline">
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 컨디션 기록이 없는 경우
  if (!condition || (!condition.conditionMemo && condition.conditionImages.length === 0)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="bg-white w-full h-full p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">컨디션 기록 조회</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">저장된 컨디션 기록이 없습니다.</p>
            <Button onClick={onClose}>닫기</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="bg-white w-full h-full p-2 overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">컨디션 기록 조회</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isDeleting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
          {/* 헤더 정보 */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">
                {condition.pt.member.user.username} 회원
              </h3>
              {condition.conditionRecordedAt && (
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(condition.conditionRecordedAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              수업일: {new Date(condition.scheduledAt).toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* 컨디션 이미지들 */}
          {condition.conditionImages.length > 0 && (
            <div>
              <h4 className="text-md font-semibold mb-3">컨디션 기록지</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {condition.conditionImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                      <img
                        src={getCloudflareImageUrl(image.cloudflareId, "thumbnail")}
                        alt={`컨디션 기록 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {image.originalName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 컨디션 메모 */}
          {condition.conditionMemo && (
            <div>
              <h4 className="text-md font-semibold mb-3">컨디션 메모</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {condition.conditionMemo}
                </p>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "삭제 중..." : "기록 삭제"}
            </Button>
            <Button onClick={onClose}>닫기</Button>
          </div>
          </div>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {selectedImageIndex !== null && condition.conditionImages[selectedImageIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeImageModal}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            {/* 닫기 버튼 */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 이전 버튼 */}
            {condition.conditionImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <RotateCcw className="w-6 h-6 rotate-90" />
              </button>
            )}

            {/* 다음 버튼 */}
            {condition.conditionImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <RotateCcw className="w-6 h-6 -rotate-90" />
              </button>
            )}

            {/* 이미지 */}
            <img
              src={getCloudflareImageUrl(condition.conditionImages[selectedImageIndex].cloudflareId, "public")}
              alt={`컨디션 기록 ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 이미지 정보 */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <p className="text-sm">
                {selectedImageIndex + 1} / {condition.conditionImages.length}
              </p>
              <p className="text-xs opacity-75">
                {condition.conditionImages[selectedImageIndex].originalName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}