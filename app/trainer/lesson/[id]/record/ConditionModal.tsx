"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { Button } from "@/app/components/ui/Button";
// import { formatDistanceToNow } from "date-fns";
// import { ko } from "date-fns/locale";
import { X, ZoomIn, RotateCcw, Trash2 } from "lucide-react";
import NextImage from "next/image";

interface ConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  templateName: string;
  onSuccess?: () => void;
}

interface ConditionImage {
  id: string;
  cloudflareId: string;
  originalName: string;
  createdAt: string;
  metadata?: {
    templateName?: string;
  };
}

interface ConditionData {
  id: string;
  conditionMemo: string | null;
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

interface CanvasData {
  templateName: string;
  canvasData: string;
  isCompleted: boolean;
}

// Cloudflare Images URL 생성 함수
function getCloudflareImageUrl(cloudflareId: string, variant = "public"): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL;
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `${baseUrl}/${accountHash}/${cloudflareId}/${variant}`;
}

// 템플릿과 캔버스 합치기 함수
async function mergeTemplateWithCanvas(templatePath: string, canvasDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    const templateImg = new Image();
    const canvasImg = new Image();
    
    let imagesLoaded = 0;
    
    const checkComplete = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        // 캔버스 크기를 템플릿 이미지에 맞춤
        canvas.width = templateImg.width;
        canvas.height = templateImg.height;
        
        // 템플릿을 배경으로 그리기
        ctx.drawImage(templateImg, 0, 0);
        
        // 캔버스 그림을 위에 그리기
        ctx.drawImage(canvasImg, 0, 0, canvas.width, canvas.height);
        
        // 결과를 base64로 변환
        const result = canvas.toDataURL("image/png");
        resolve(result);
      }
    };
    
    templateImg.onload = checkComplete;
    templateImg.onerror = () => reject(new Error("Template image loading failed"));
    
    canvasImg.onload = checkComplete;
    canvasImg.onerror = () => reject(new Error("Canvas image loading failed"));
    
    // 이미지 로드 시작
    templateImg.src = templatePath;
    canvasImg.src = canvasDataUrl;
  });
}

// 업로드 함수
async function uploadCondition(url: string, { arg }: { arg: CanvasData }) {
  const { templateName, canvasData, isCompleted } = arg;
  
  if (!isCompleted) {
    throw new Error("기록지를 완성해주세요.");
  }

  // 템플릿 이미지와 캔버스 합치기
  const templatePath = `/images/condition_canvas/${templateName}`;
  const mergedImageData = await mergeTemplateWithCanvas(templatePath, canvasData);
  
  // base64를 blob으로 변환
  const base64Response = await fetch(mergedImageData);
  const blob = await base64Response.blob();
  
  // 1. 업로드 URL 요청
  const uploadResponse = await fetch("/api/media/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityType: "CONDITION",
      templateName,
    }),
  });

  if (!uploadResponse.ok) {
    throw new Error("업로드 URL 생성 실패");
  }

  const { uploadURL, customId } = await uploadResponse.json();

  // 2. 이미지 업로드
  const formData = new FormData();
  formData.append("file", blob, `${templateName}-condition.png`);

  const cloudflareResponse = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });

  if (!cloudflareResponse.ok) {
    throw new Error("이미지 업로드 실패");
  }

  // 3. DB에 저장 확인
  const confirmResponse = await fetch("/api/media/images/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cloudflareId: customId,
      originalName: `${templateName}-condition.png`,
      mimeType: "image/png",
      size: blob.size,
      entityType: "CONDITION",
      entityId: url.split("/").slice(-2, -1)[0], // lessonId 추출
      metadata: { templateName },
    }),
  });

  if (!confirmResponse.ok) {
    throw new Error("이미지 정보 저장 실패");
  }

  const savedImage = await confirmResponse.json();

  // 4. 컨디션 생성/업데이트
  const conditionResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageIds: [savedImage.id],
      conditionMemo: null,
    }),
  });

  if (!conditionResponse.ok) {
    throw new Error("컨디션 기록 저장 실패");
  }

  return conditionResponse.json();
}

// 삭제 함수
async function deleteTemplateCondition(url: string, { arg }: { arg: { templateName: string } }) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateName: arg.templateName }),
  });

  if (!response.ok) {
    throw new Error("삭제 실패");
  }

  return response.json();
}

export default function ConditionModal({
  isOpen,
  onClose,
  lessonId,
  templateName,
  onSuccess,
}: ConditionModalProps) {
  const { mutate } = useSWRConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasData, setCanvasData] = useState<CanvasData>({
    templateName,
    canvasData: "",
    isCompleted: false,
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // 컨디션 데이터 조회
  const { data: condition, error } = useSWR<ConditionData>(
    isOpen ? `/api/trainer/lesson/${lessonId}/condition` : null,
    {
      revalidateOnFocus: false,
    }
  );

  // 업로드 mutation
  const { trigger: uploadTrigger, isMutating: isUploading } = useSWRMutation(
    `/api/trainer/lesson/${lessonId}/condition`,
    uploadCondition,
    {
      onSuccess: () => {
        mutate(`/api/trainer/lesson/${lessonId}/condition`);
        onSuccess?.();
        onClose();
      },
      onError: (error) => {
        console.error("Upload error:", error);
        alert(error.message || "업로드 중 오류가 발생했습니다.");
      },
    }
  );

  // 삭제 mutation  
  const { trigger: deleteTrigger, isMutating: isDeleting } = useSWRMutation(
    `/api/trainer/lesson/${lessonId}/condition/template`,
    deleteTemplateCondition,
    {
      onSuccess: () => {
        mutate(`/api/trainer/lesson/${lessonId}/condition`);
        onSuccess?.();
        onClose();
      },
      onError: (error) => {
        console.error("Delete error:", error);
        alert(error.message || "삭제 중 오류가 발생했습니다.");
      },
    }
  );

  // 해당 템플릿의 기존 이미지들 필터링
  const templateImages = useMemo(() => {
    if (!condition?.conditionImages) return [];
    return condition.conditionImages.filter(img => 
      img.metadata?.templateName === templateName
    );
  }, [condition?.conditionImages, templateName]);

  const hasExistingRecord = templateImages.length > 0;

  // 캔버스 초기화
  useEffect(() => {
    if (!hasExistingRecord && canvasRef.current && isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 800;
        canvas.height = 600;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [hasExistingRecord, isOpen, templateName]);

  // 캔버스 그리기 이벤트 핸들러
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasExistingRecord) return;
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || hasExistingRecord) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // 그리기 상태 업데이트
    setCanvasData(prev => ({
      ...prev,
      canvasData: canvas.toDataURL(),
      isCompleted: true,
    }));
  };

  const stopDrawing = () => {
    if (!hasExistingRecord) {
      setIsDrawing(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.beginPath();
      }
    }
  };

  // 캔버스 지우기
  const clearCanvas = () => {
    if (!canvasRef.current || hasExistingRecord) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setCanvasData(prev => ({
        ...prev,
        canvasData: "",
        isCompleted: false,
      }));
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (hasExistingRecord) return;
    
    if (!canvasData.isCompleted) {
      alert("기록지를 작성해주세요.");
      return;
    }

    await uploadTrigger(canvasData);
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!hasExistingRecord) return;
    
    if (!confirm(`${templateName} 컨디션 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    await deleteTrigger({ templateName });
  };

  // 이미지 모달 닫기
  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  // 이미지 네비게이션
  const goToPrevImage = () => {
    if (selectedImageIndex !== null && templateImages.length > 0) {
      setSelectedImageIndex(
        selectedImageIndex > 0 ? selectedImageIndex - 1 : templateImages.length - 1
      );
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && templateImages.length > 0) {
      setSelectedImageIndex(
        selectedImageIndex < templateImages.length - 1 ? selectedImageIndex + 1 : 0
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
            <h2 className="text-xl font-bold">{templateName} 컨디션 기록</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
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
            <h2 className="text-xl font-bold">{templateName} 컨디션 기록</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">컨디션 기록을 불러올 수 없습니다.</p>
            <Button onClick={onClose} variant="outline">
              닫기
            </Button>
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
            <h2 className="text-xl font-bold">{templateName} 컨디션 기록</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isUploading || isDeleting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 헤더 정보 */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold">
                {condition?.pt.member.user.username} 회원
              </h3>
              <p className="text-sm text-gray-600">
                수업일: {condition ? new Date(condition.scheduledAt).toLocaleDateString("ko-KR") : ""}
              </p>
            </div>

            {hasExistingRecord ? (
              /* 기존 기록 보기 모드 */
              <>
                {/* 컨디션 이미지들 */}
                <div>
                  <h4 className="text-md font-semibold mb-3">컨디션 기록지</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templateImages.map((image, index) => (
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
              </>
            ) : (
              /* 새 기록 작성 모드 */
              <>
                {/* 템플릿 배경 */}
                <div className="mb-4">
                  <h4 className="text-md font-semibold mb-3">기록지 작성</h4>
                  <div className="relative bg-gray-50 rounded-lg p-4">
                    {/* 템플릿 배경 이미지 */}
                    <div className="absolute inset-4">
                      <NextImage
                        src={`/images/condition_canvas/${templateName}`}
                        alt={`${templateName} 템플릿`}
                        fill
                        className="object-contain opacity-30"
                      />
                    </div>
                    
                    {/* 캔버스 */}
                    <canvas
                      ref={canvasRef}
                      className="border border-gray-300 rounded cursor-crosshair relative z-10 bg-transparent"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      style={{
                        width: "100%",
                        maxWidth: "800px",
                        height: "400px",
                      }}
                    />
                  </div>
                </div>

                {/* 컨트롤 버튼들 */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={clearCanvas}
                    variant="outline"
                    disabled={isUploading}
                  >
                    지우기
                  </Button>
                </div>

                {/* 저장 버튼 */}
                <div className="flex justify-between pt-4 border-t">
                  <Button onClick={onClose} variant="outline">
                    취소
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!canvasData.isCompleted || isUploading}
                    className="md:px-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {hasExistingRecord && selectedImageIndex !== null && templateImages[selectedImageIndex] && (
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
            {templateImages.length > 1 && (
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
            {templateImages.length > 1 && (
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
              src={getCloudflareImageUrl(templateImages[selectedImageIndex].cloudflareId, "public")}
              alt={`컨디션 기록 ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 이미지 정보 */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <p className="text-sm">
                {selectedImageIndex + 1} / {templateImages.length}
              </p>
              <p className="text-xs opacity-75">
                {templateImages[selectedImageIndex].originalName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}