"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import NextImage from "next/image";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/app/components/ui/Button";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { X, Trash2, ZoomIn, RotateCcw } from "lucide-react";
import { ImageType } from "@prisma/client";

interface EnhancedConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  onSuccess?: () => void;
}

interface TemplateState {
  templateName: string;
  status: 'memory' | 'server' | 'empty';
  canvasData?: string; // 메모리 저장된 그림 데이터
  serverImageId?: string; // 서버 저장된 이미지 ID
  serverImageUrl?: string; // 서버 이미지 URL
  isCompleted: boolean;
}

interface DeleteConfirmModal {
  isOpen: boolean;
  templateName: string;
  message: string;
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

const TEMPLATES = [
  {
    name: "pain_canvas.png",
    label: "통증 기록지",
    path: "/images/condition_canvas/pain_canvas.png",
  },
  {
    name: "position_canvas.png", 
    label: "자세 기록지",
    path: "/images/condition_canvas/position_canvas.png",
  },
];

const PEN_COLORS = [
  { name: "검은색", color: "#000000" },
  { name: "빨간색", color: "#ff0000" },
  { name: "파란색", color: "#0000ff" },
  { name: "녹색", color: "#00ff00" },
];

const PEN_SIZES = [
  { name: "얇음", size: 2 },
  { name: "보통", size: 4 },
  { name: "굵음", size: 6 },
  { name: "매우 굵음", size: 8 },
];

// Cloudflare Images URL 생성 함수
function getCloudflareImageUrl(cloudflareId: string, variant = "public"): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL;
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `${baseUrl}/${accountHash}/${cloudflareId}/${variant}`;
}

// 템플릿과 캔버스를 합성하여 하나의 이미지로 만드는 함수
async function mergeTemplateWithCanvas(templatePath: string, canvasDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // 템플릿 이미지 로드
    const templateImg = new Image();
    templateImg.onload = () => {
      // 캔버스 크기를 템플릿 이미지 크기로 설정
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;
      
      // 템플릿 배경 그리기
      ctx.drawImage(templateImg, 0, 0);
      
      // 그려진 캔버스 이미지 로드
      const drawingImg = new Image();
      drawingImg.onload = () => {
        // 그려진 내용을 템플릿 위에 합성
        ctx.drawImage(drawingImg, 0, 0, canvas.width, canvas.height);
        
        // 합성된 이미지를 데이터 URL로 반환
        resolve(canvas.toDataURL('image/png'));
      };
      drawingImg.onerror = () => reject(new Error('Failed to load canvas drawing'));
      drawingImg.src = canvasDataUrl;
    };
    templateImg.onerror = () => reject(new Error('Failed to load template image'));
    templateImg.src = templatePath;
  });
}

// 이미지 업로드 함수
async function uploadConditionImage(blob: Blob, templateName: string, lessonId?: string): Promise<string> {
  // 1. 업로드 URL 요청
  const uploadResponse = await fetch("/api/media/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      entityType: "CONDITION",
      metadata: { templateName }
    }),
  });

  if (!uploadResponse.ok) {
    throw new Error("업로드 URL 생성 실패");
  }

  const { uploadURL, customId } = await uploadResponse.json();

  // 2. Cloudflare로 직접 업로드
  const formData = new FormData();
  formData.append("file", blob, `condition-${templateName}-${Date.now()}.png`);

  const cloudflareResponse = await fetch(uploadURL, {
    method: "POST",
    body: formData,
  });

  if (!cloudflareResponse.ok) {
    throw new Error("이미지 업로드 실패");
  }

  // 3. DB에 이미지 정보 저장 및 ID 반환
  const saveResponse = await fetch("/api/media/images/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cloudflareId: customId,
      originalName: `condition-${templateName}-${Date.now()}.png`,
      mimeType: "image/png",
      size: blob.size,
      type: ImageType.CONDITION,
      entityId: lessonId,
      metadata: { templateName }
    }),
  });

  if (!saveResponse.ok) {
    throw new Error("이미지 정보 저장 실패");
  }

  const { id } = await saveResponse.json();
  return id;
}

// 컨디션 저장 함수
async function saveConditionRecord(url: string, { arg }: { arg: { conditionMemo?: string, imageIds: string[] } }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "저장에 실패했습니다");
  }

  return response.json();
}

// 템플릿별 삭제 함수
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

export default function EnhancedConditionModal({ 
  isOpen, 
  onClose, 
  lessonId, 
  onSuccess 
}: EnhancedConditionModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateStates, setTemplateStates] = useState<TemplateState[]>([]);
  const [conditionMemo, setConditionMemo] = useState<string>("");
  const [penColor, setPenColor] = useState<string>("#000000");
  const [penSize, setPenSize] = useState<number>(4);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal>({
    isOpen: false,
    templateName: '',
    message: ''
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [serverImages, setServerImages] = useState<ConditionImage[]>([]);

  const canvasRefs = useRef<Record<string, SignatureCanvas | null>>({});

  // 기존 컨디션 데이터 조회
  const { data: existingCondition, mutate: mutateCondition } = useSWR<ConditionData>(
    isOpen ? `/api/trainer/lesson/${lessonId}/condition` : null,
    {
      revalidateOnFocus: false,
    }
  );

  // 컨디션 저장 mutation
  const { trigger: saveCondition, isMutating: isSaving } = useSWRMutation(
    `/api/trainer/lesson/${lessonId}/condition`,
    saveConditionRecord
  );

  // 삭제 mutation  
  const { trigger: deleteCondition, isMutating: isDeleting } = useSWRMutation(
    `/api/trainer/lesson/${lessonId}/condition/template`,
    deleteTemplateCondition
  );

  // 초기화 - 서버 데이터를 templateStates에 반영
  useEffect(() => {
    if (existingCondition?.conditionImages) {
      setServerImages(existingCondition.conditionImages);
      setConditionMemo(existingCondition.conditionMemo || "");
      
      // 템플릿 상태 초기화
      const initialStates: TemplateState[] = TEMPLATES.map(template => {
        const serverImage = existingCondition.conditionImages.find(img => 
          img.metadata && (img.metadata as any).templateName === template.name
        );
        
        if (serverImage) {
          return {
            templateName: template.name,
            status: 'server',
            serverImageId: serverImage.id,
            serverImageUrl: getCloudflareImageUrl(serverImage.cloudflareId),
            isCompleted: true
          };
        }
        
        return {
          templateName: template.name,
          status: 'empty',
          isCompleted: false
        };
      });
      
      setTemplateStates(initialStates);
    } else if (isOpen) {
      // 기존 데이터가 없으면 빈 상태로 초기화
      const emptyStates: TemplateState[] = TEMPLATES.map(template => ({
        templateName: template.name,
        status: 'empty',
        isCompleted: false
      }));
      setTemplateStates(emptyStates);
      setConditionMemo("");
    }
  }, [existingCondition, isOpen]);

  // 현재 선택된 템플릿 상태
  const currentTemplateState = useMemo(() => {
    return templateStates.find(state => state.templateName === selectedTemplate);
  }, [templateStates, selectedTemplate]);

  // 현재 선택된 템플릿의 캔버스 가져오기
  const getCurrentCanvas = useCallback(() => {
    return canvasRefs.current[selectedTemplate];
  }, [selectedTemplate]);

  // 템플릿 선택 핸들러
  const handleTemplateSelect = useCallback((templateName: string) => {
    // 현재 그리기 중인 내용이 있으면 저장
    if (selectedTemplate) {
      const currentCanvas = canvasRefs.current[selectedTemplate];
      if (currentCanvas && !currentCanvas.isEmpty()) {
        const canvasData = currentCanvas.toDataURL();
        setTemplateStates(prev => prev.map(state => 
          state.templateName === selectedTemplate 
            ? { ...state, canvasData, status: 'memory', isCompleted: true }
            : state
        ));
      }
    }

    // 새 템플릿 선택
    setSelectedTemplate(templateName);
  }, [selectedTemplate]);

  // 선택된 템플릿 변경 시 캔버스 데이터 복원
  useEffect(() => {
    if (selectedTemplate) {
      const templateState = templateStates.find(s => s.templateName === selectedTemplate);
      
      if (templateState?.canvasData) {
        // Canvas ref가 준비될 때까지 대기
        const restoreCanvas = () => {
          const canvas = canvasRefs.current[selectedTemplate];
          if (canvas) {
            try {
              canvas.clear();
              canvas.fromDataURL(templateState.canvasData!);
            } catch (error) {
              console.error('Canvas restore error:', error);
            }
          } else {
            // Canvas가 아직 준비되지 않았으면 다시 시도
            setTimeout(restoreCanvas, 10);
          }
        };
        
        // React 렌더링 사이클 후 실행
        requestAnimationFrame(() => {
          setTimeout(restoreCanvas, 0);
        });
      }
    }
  }, [selectedTemplate, templateStates]);

  // 그리기 완료 처리
  const handleSaveDrawing = useCallback(async () => {
    const canvas = getCurrentCanvas();
    if (!canvas || canvas.isEmpty() || !selectedTemplate) {
      alert("그림을 그려주세요.");
      return;
    }

    try {
      const canvasData = canvas.toDataURL();
      
      // 메모리에 임시 저장
      setTemplateStates(prev => prev.map(state => 
        state.templateName === selectedTemplate 
          ? { ...state, canvasData, status: 'memory', isCompleted: true }
          : state
      ));
      
      alert("그리기가 완료되었습니다.");
    } catch (error) {
      console.error("Save drawing error:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  }, [selectedTemplate, getCurrentCanvas]);

  // 삭제 핸들러
  const handleDelete = async (templateName: string) => {
    const state = templateStates.find(s => s.templateName === templateName);
    
    if (state?.status === 'memory') {
      // 메모리에서 바로 제거
      setTemplateStates(prev => prev.map(s => 
        s.templateName === templateName 
          ? { ...s, status: 'empty', canvasData: undefined, isCompleted: false }
          : s
      ));
      
      // 현재 선택된 템플릿이면 캔버스도 초기화
      if (selectedTemplate === templateName) {
        const canvas = getCurrentCanvas();
        if (canvas) {
          canvas.clear();
        }
      }
    } else if (state?.status === 'server') {
      // 확인 모달 표시
      const template = TEMPLATES.find(t => t.name === templateName);
      setDeleteConfirmModal({
        isOpen: true,
        templateName,
        message: `${template?.label} 기록을 서버에서 완전히 삭제됩니다. 계속할까요?`
      });
    }
  };

  // 서버 삭제 실행
  const executeServerDelete = async () => {
    if (!deleteConfirmModal.templateName) return;

    try {
      await deleteCondition({ templateName: deleteConfirmModal.templateName });
      
      // 상태 업데이트
      setTemplateStates(prev => prev.map(s => 
        s.templateName === deleteConfirmModal.templateName 
          ? { ...s, status: 'empty', serverImageId: undefined, serverImageUrl: undefined, isCompleted: false }
          : s
      ));

      // 현재 선택된 템플릿이면 캔버스 표시
      if (selectedTemplate === deleteConfirmModal.templateName) {
        const canvas = getCurrentCanvas();
        if (canvas) {
          canvas.clear();
        }
      }
      
      // 서버 데이터 갱신
      await mutateCondition();
      
      setDeleteConfirmModal({ isOpen: false, templateName: '', message: '' });
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 최종 저장 (서버에 업로드)
  const handleFinalSave = async () => {
    try {
      const memoryTemplates = templateStates.filter(state => state.status === 'memory');
      
      if (memoryTemplates.length === 0) {
        alert("저장할 이미지가 없습니다.");
        return;
      }

      const imageIds: string[] = [];
      const failedTemplates: string[] = [];

      // 메모리에 있는 이미지들을 서버에 업로드
      for (const template of memoryTemplates) {
        if (template.canvasData) {
          try {
            console.log(`업로드 시작: ${template.templateName}`);
            
            // 템플릿과 합성
            const templatePath = TEMPLATES.find(t => t.name === template.templateName)?.path;
            if (templatePath) {
              const mergedImageData = await mergeTemplateWithCanvas(templatePath, template.canvasData);
              
              // base64를 blob으로 변환
              const base64Response = await fetch(mergedImageData);
              const blob = await base64Response.blob();
              
              // 업로드
              const imageId = await uploadConditionImage(blob, template.templateName, lessonId);
              imageIds.push(imageId);
              
              console.log(`업로드 성공: ${template.templateName}, ID: ${imageId}`);
            } else {
              console.warn(`템플릿 경로를 찾을 수 없음: ${template.templateName}`);
              failedTemplates.push(template.templateName);
            }
          } catch (error) {
            console.error(`${template.templateName} 업로드 실패:`, error);
            failedTemplates.push(template.templateName);
          }
        }
      }

      if (imageIds.length > 0) {
        // 컨디션 기록 저장
        await saveCondition({
          conditionMemo: conditionMemo.trim() || undefined,
          imageIds,
        });

        // 결과 메시지 생성
        let message = `${imageIds.length}개의 컨디션 기록이 저장되었습니다.`;
        if (failedTemplates.length > 0) {
          message += `\n\n실패한 템플릿 (${failedTemplates.length}개): ${failedTemplates.join(', ')}`;
        }
        
        alert(message);
        onSuccess?.();
        onClose();
      } else if (failedTemplates.length > 0) {
        alert(`모든 이미지 업로드가 실패했습니다.\n실패한 템플릿: ${failedTemplates.join(', ')}`);
      } else {
        alert("저장할 이미지가 없습니다.");
      }
    } catch (error) {
      console.error("Final save error:", error);
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    }
  };

  // 이미지 모달 핸들러
  const closeImageModal = () => setSelectedImageIndex(null);

  const goToPrevImage = () => {
    if (selectedImageIndex !== null && serverImages.length > 0) {
      setSelectedImageIndex(
        selectedImageIndex > 0 ? selectedImageIndex - 1 : serverImages.length - 1
      );
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && serverImages.length > 0) {
      setSelectedImageIndex(
        selectedImageIndex < serverImages.length - 1 ? selectedImageIndex + 1 : 0
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="bg-white w-full h-full p-2 overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">컨디션 기록</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isSaving || isDeleting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 템플릿 선택 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">기록지 선택</h3>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((template) => {
                  const state = templateStates.find(s => s.templateName === template.name);
                  const status = state?.status || 'empty';
                  
                  return (
                    <div key={template.name} className="relative">
                      <button
                        onClick={() => handleTemplateSelect(template.name)}
                        className={`w-full p-3 rounded-lg border-2 text-center transition-colors ${
                          selectedTemplate === template.name
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {template.label}
                      </button>
                      
                      {/* 상태 배지 */}
                      <div className="flex gap-1 mt-1">
                        {status === 'memory' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            임시저장
                          </span>
                        )}
                        {status === 'server' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            서버저장
                          </span>
                        )}
                        {state?.isCompleted && status !== 'empty' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.name);
                            }}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 선택된 템플릿의 내용 */}
            {selectedTemplate && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {TEMPLATES.find(t => t.name === selectedTemplate)?.label}
                </h3>
                
                {/* 서버에 저장된 이미지 보기 */}
                {currentTemplateState?.status === 'server' && currentTemplateState.serverImageUrl ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <img
                        src={currentTemplateState.serverImageUrl}
                        alt="저장된 컨디션 기록"
                        className="max-w-full h-auto cursor-pointer"
                        onClick={() => setSelectedImageIndex(0)}
                      />
                    </div>
                  </div>
                ) : (
                  /* 캔버스 그리기 인터페이스 */
                  <div className="space-y-4">
                    {/* 템플릿 배경과 캔버스 */}
                    <div className="relative bg-gray-50 rounded-lg p-4">
                      {/* 템플릿 배경 */}
                      <div className="absolute inset-4 opacity-30">
                        <NextImage
                          src={TEMPLATES.find(t => t.name === selectedTemplate)?.path || ""}
                          alt="템플릿"
                          fill
                          className="object-contain"
                        />
                      </div>
                      
                      {/* 그리기 캔버스 */}
                      <SignatureCanvas
                        key={selectedTemplate}
                        ref={(ref) => { 
                          canvasRefs.current[selectedTemplate] = ref; 
                        }}
                        canvasProps={{
                          className: "border border-gray-300 rounded relative z-10 bg-transparent cursor-crosshair",
                          style: { width: "100%", height: "400px" }
                        }}
                        backgroundColor="transparent"
                        penColor={penColor}
                        minWidth={penSize}
                        maxWidth={penSize}
                      />
                    </div>

                    {/* 펜 도구 */}
                    <div className="flex flex-wrap gap-4">
                      {/* 펜 색상 */}
                      <div>
                        <label className="block text-sm font-medium mb-2">펜 색상</label>
                        <div className="flex gap-2">
                          {PEN_COLORS.map((color) => (
                            <button
                              key={color.color}
                              onClick={() => setPenColor(color.color)}
                              className={`w-8 h-8 rounded border-2 ${
                                penColor === color.color ? "border-gray-800" : "border-gray-300"
                              }`}
                              style={{ backgroundColor: color.color }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 펜 굵기 */}
                      <div>
                        <label className="block text-sm font-medium mb-2">펜 굵기</label>
                        <div className="flex gap-2">
                          {PEN_SIZES.map((size) => (
                            <button
                              key={size.size}
                              onClick={() => setPenSize(size.size)}
                              className={`px-3 py-1 rounded text-sm border ${
                                penSize === size.size
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300"
                              }`}
                            >
                              {size.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 캔버스 조작 버튼 */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const canvas = getCurrentCanvas();
                          if (canvas) {
                            canvas.clear();
                          }
                        }}
                        variant="outline"
                      >
                        지우기
                      </Button>
                      <Button
                        onClick={handleSaveDrawing}
                        variant="outline"
                      >
                        그리기 완료
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 메모 입력 */}
            <div>
              <label className="block text-sm font-medium mb-2">컨디션 메모 (선택사항)</label>
              <textarea
                value={conditionMemo}
                onChange={(e) => setConditionMemo(e.target.value)}
                placeholder="컨디션에 대한 추가 메모를 입력하세요..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-between pt-4 border-t">
              <Button onClick={onClose} variant="outline">
                취소
              </Button>
              
              {templateStates.some(state => state.status === 'memory') && (
                <Button
                  onClick={handleFinalSave}
                  disabled={isSaving}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSaving ? "저장 중..." : "저장하기"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">삭제 확인</h3>
            <p className="text-gray-600 mb-6">{deleteConfirmModal.message}</p>
            
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setDeleteConfirmModal({ isOpen: false, templateName: '', message: '' })}
                variant="outline"
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                onClick={executeServerDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    삭제 중...
                  </div>
                ) : (
                  "삭제하기"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {selectedImageIndex !== null && serverImages[selectedImageIndex] && (
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
            {serverImages.length > 1 && (
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
            {serverImages.length > 1 && (
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
              src={getCloudflareImageUrl(serverImages[selectedImageIndex].cloudflareId, "public")}
              alt={`컨디션 기록 ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 이미지 정보 */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
              <p className="text-sm">
                {selectedImageIndex + 1} / {serverImages.length}
              </p>
              <p className="text-xs opacity-75">
                {serverImages[selectedImageIndex].originalName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}