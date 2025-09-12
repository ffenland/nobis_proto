"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import NextImage from "next/image";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/app/components/ui/Button";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { X, Trash2 } from "lucide-react";
import { ImageType, type ImageUploadRequest, type RequestImageUploadResult, type ConfirmImageUploadResult } from "@/app/services/media/media.service";
import { LoadingSpinner } from "@/app/components/ui/Loading";

interface EnhancedConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  onSuccess?: () => void;
}

interface TemplateState {
  templateName: string;
  status: "memory" | "server" | "empty";
  canvasData?: string; // "그리기 완료" 후 메모리 저장된 그림 데이터
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
  { name: "녹색", color: "#0a9c3f" },
];

const PEN_SIZES = [
  { name: "얇음", size: 1 },
  { name: "보통", size: 3 },
  { name: "굵음", size: 5 },
];

// Cloudflare Images URL 생성 함수
function getCloudflareImageUrl(
  cloudflareId: string,
  variant = "public"
): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL;
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `${baseUrl}/${accountHash}/${cloudflareId}/${variant}`;
}

// 템플릿과 캔버스를 합성하여 하나의 이미지로 만드는 함수
async function mergeTemplateWithCanvas(
  templatePath: string,
  canvasDataUrl: string,
  containerDimensions?: { width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    // 템플릿 이미지 로드
    const templateImg = new Image();
    templateImg.onload = () => {
      // 그려진 캔버스 이미지 로드
      const drawingImg = new Image();
      drawingImg.onload = () => {
        // 컨테이너 크기 사용 (템플릿과 캔버스가 동일한 크기)
        const targetWidth = containerDimensions?.width || 400;
        const targetHeight = containerDimensions?.height || 368;
        
        // 캔버스 크기 설정
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 흰색 배경
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 템플릿 배경 그리기 (object-fill 방식 - 컨테이너를 완전히 채움)
        ctx.drawImage(templateImg, 0, 0, targetWidth, targetHeight);

        // 그려진 내용을 동일한 크기로 합성 
        ctx.drawImage(drawingImg, 0, 0, targetWidth, targetHeight);

        // 합성된 이미지를 데이터 URL로 반환
        resolve(canvas.toDataURL("image/png"));
      };
      drawingImg.onerror = () =>
        reject(new Error("Failed to load canvas drawing"));
      drawingImg.src = canvasDataUrl;
    };
    templateImg.onerror = () =>
      reject(new Error("Failed to load template image"));
    templateImg.src = templatePath;
  });
}

// 이미지 업로드 함수
async function uploadConditionImage(
  blob: Blob,
  templateName: string,
  lessonId?: string
): Promise<string> {
  // 1. 업로드 URL 요청
  const requestBody: ImageUploadRequest = {
    entityType: "CONDITION" as ImageType,
    entityId: lessonId,
    metadata: { templateName },
  };

  const uploadResponse = await fetch("/api/media/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!uploadResponse.ok) {
    const errorData: { error: string } = await uploadResponse.json();
    throw new Error(errorData.error || "업로드 URL 생성 실패");
  }

  const { uploadURL, id }: RequestImageUploadResult = await uploadResponse.json();

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
      cloudflareId: id,
      entityType: "CONDITION",
      entityId: lessonId,
    }),
  });

  if (!saveResponse.ok) {
    const errorData: { error: string } = await saveResponse.json();
    throw new Error(errorData.error || "이미지 정보 저장 실패");
  }

  const { id: dbId }: ConfirmImageUploadResult = await saveResponse.json();
  return dbId;
}

// 컨디션 저장 함수
async function saveConditionRecord(
  url: string,
  { arg }: { arg: { conditionMemo?: string; imageIds: string[] } }
) {
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
async function deleteTemplateCondition(
  url: string,
  { arg }: { arg: { templateName: string } }
) {
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
  onSuccess,
}: EnhancedConditionModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateStates, setTemplateStates] = useState<TemplateState[]>([]);
  const [conditionMemo, setConditionMemo] = useState<string>("");
  const [initialConditionMemo, setInitialConditionMemo] = useState<string>("");
  const [penColor, setPenColor] = useState<string>("#000000");

  // 로딩 상태 관리
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [penSize, setPenSize] = useState<number>(3);
  const [deleteConfirmModal, setDeleteConfirmModal] =
    useState<DeleteConfirmModal>({
      isOpen: false,
      templateName: "",
      message: "",
    });

  // 템플릿 컨테이너 크기 저장
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const canvasRefs = useRef<Record<string, SignatureCanvas | null>>({});
  const templateContainerRef = useRef<HTMLDivElement | null>(null);

  // 기존 컨디션 데이터 조회
  const { data: existingCondition, mutate: mutateCondition } =
    useSWR<ConditionData>(
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
      const memo = existingCondition.conditionMemo || "";
      setConditionMemo(memo);
      setInitialConditionMemo(memo); // 초기 메모 값 저장

      // 템플릿 상태 초기화
      const initialStates: TemplateState[] = TEMPLATES.map((template) => {
        const serverImage = existingCondition.conditionImages.find(
          (img) =>
            img.metadata && (img.metadata as any).templateName === template.name
        );

        if (serverImage) {
          return {
            templateName: template.name,
            status: "server",
            serverImageId: serverImage.id,
            serverImageUrl: getCloudflareImageUrl(serverImage.cloudflareId),
            isCompleted: true,
          };
        }

        return {
          templateName: template.name,
          status: "empty",
          isCompleted: false,
        };
      });

      setTemplateStates(initialStates);
    } else if (isOpen) {
      // 기존 데이터가 없으면 빈 상태로 초기화
      const emptyStates: TemplateState[] = TEMPLATES.map((template) => ({
        templateName: template.name,
        status: "empty",
        isCompleted: false,
      }));
      setTemplateStates(emptyStates);
      setConditionMemo("");
      setInitialConditionMemo(""); // 초기 메모 값 초기화
    }
  }, [existingCondition, isOpen]);

  // 모달이 열릴 때 템플릿 선택 초기화 및 컨테이너 크기 측정
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(""); // 템플릿 선택 초기화
      
      // 컨테이너 크기 측정을 위한 타이머
      const timer = setTimeout(() => {
        if (templateContainerRef.current) {
          const rect = templateContainerRef.current.getBoundingClientRect();
          setContainerDimensions({
            width: rect.width - 32, // padding 제외 (p-4 = 16px * 2) 
            height: 400 - 32 // 고정 높이에서 패딩 제외 (상하 16px * 2)
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 반응형 크기 처리 - 윈도우 리사이즈 시 컨테이너 크기 재측정
  useEffect(() => {
    if (!isOpen || !templateContainerRef.current) return;

    const updateContainerSize = () => {
      if (templateContainerRef.current) {
        const rect = templateContainerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width - 32,
          height: 400 - 32 // 고정 높이에서 패딩 제외
        });
      }
    };

    // ResizeObserver를 사용하여 컨테이너 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
    });

    resizeObserver.observe(templateContainerRef.current);

    // 윈도우 리사이즈 이벤트도 함께 처리
    window.addEventListener('resize', updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerSize);
    };
  }, [isOpen]);


  // 현재 선택된 템플릿 상태
  const currentTemplateState = useMemo(() => {
    return templateStates.find(
      (state) => state.templateName === selectedTemplate
    );
  }, [templateStates, selectedTemplate]);

  // 변경사항 감지
  const hasChanges = useMemo(() => {
    // 메모 변경 확인
    const memoChanged = conditionMemo !== initialConditionMemo;

    // 새로 그린 이미지 확인
    const hasNewImages = templateStates.some(
      (state) => state.status === "memory"
    );

    return memoChanged || hasNewImages;
  }, [conditionMemo, initialConditionMemo, templateStates]);

  // 현재 선택된 템플릿의 캔버스 가져오기
  const getCurrentCanvas = useCallback(() => {
    return canvasRefs.current[selectedTemplate];
  }, [selectedTemplate]);

  // 템플릿 선택 핸들러
  const handleTemplateSelect = useCallback(
    (templateName: string) => {
      // 현재 캔버스 초기화 (임시저장 없이 리셋)
      if (selectedTemplate) {
        const currentCanvas = canvasRefs.current[selectedTemplate];
        if (currentCanvas) {
          currentCanvas.clear();
        }
      }

      // 새 템플릿 선택
      setSelectedTemplate(templateName);
    },
    [selectedTemplate]
  );

  // 그리기 완료 처리
  const handleSaveDrawing = useCallback(async () => {
    const canvas = getCurrentCanvas();
    if (!canvas || canvas.isEmpty() || !selectedTemplate) {
      alert("그림을 그려주세요.");
      return;
    }

    try {
      const canvasData = canvas.toDataURL();
      const templatePath = TEMPLATES.find(
        (t) => t.name === selectedTemplate
      )?.path;

      if (templatePath) {
        // 컨테이너 크기 전달 (템플릿과 캔버스가 동일한 크기)
        const mergedImageData = await mergeTemplateWithCanvas(
          templatePath,
          canvasData,
          containerDimensions
        );

        // 합성된 이미지를 메모리에 저장
        setTemplateStates((prev) =>
          prev.map((state) =>
            state.templateName === selectedTemplate
              ? {
                  ...state,
                  canvasData: mergedImageData,
                  status: "memory",
                  isCompleted: true,
                }
              : state
          )
        );

        alert("그리기가 완료되었습니다.");
      } else {
        alert("템플릿을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Save drawing error:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  }, [selectedTemplate, getCurrentCanvas, containerDimensions]);

  // 삭제 핸들러
  const handleDelete = async (templateName: string) => {
    const state = templateStates.find((s) => s.templateName === templateName);

    if (state?.status === "memory") {
      // 메모리에서 바로 제거
      setTemplateStates((prev) =>
        prev.map((s) =>
          s.templateName === templateName
            ? {
                ...s,
                status: "empty",
                canvasData: undefined,
                isCompleted: false,
              }
            : s
        )
      );

      // 현재 선택된 템플릿이면 캔버스도 초기화
      if (selectedTemplate === templateName) {
        const canvas = getCurrentCanvas();
        if (canvas) {
          canvas.clear();
        }
      }
    } else if (state?.status === "server") {
      // 확인 모달 표시
      const template = TEMPLATES.find((t) => t.name === templateName);
      setDeleteConfirmModal({
        isOpen: true,
        templateName,
        message: `${template?.label} 기록을 서버에서 완전히 삭제됩니다. 계속할까요?`,
      });
    }
  };

  // 서버 삭제 실행
  const executeServerDelete = async () => {
    if (!deleteConfirmModal.templateName) return;

    try {
      await deleteCondition({ templateName: deleteConfirmModal.templateName });

      // 상태 업데이트
      setTemplateStates((prev) =>
        prev.map((s) =>
          s.templateName === deleteConfirmModal.templateName
            ? {
                ...s,
                status: "empty",
                serverImageId: undefined,
                serverImageUrl: undefined,
                isCompleted: false,
              }
            : s
        )
      );

      // 현재 선택된 템플릿이면 캔버스 표시
      if (selectedTemplate === deleteConfirmModal.templateName) {
        const canvas = getCurrentCanvas();
        if (canvas) {
          canvas.clear();
        }
      }

      // 서버 데이터 갱신
      await mutateCondition();

      setDeleteConfirmModal({ isOpen: false, templateName: "", message: "" });
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 최종 저장 (서버에 업로드)
  const handleFinalSave = async () => {
    try {
      const memoryTemplates = templateStates.filter(
        (state) => state.status === "memory"
      );
      const memoChanged = conditionMemo !== initialConditionMemo;

      // 변경사항이 없으면 리턴
      if (memoryTemplates.length === 0 && !memoChanged) {
        alert("변경사항이 없습니다.");
        return;
      }

      // 로딩 상태 초기화
      setIsUploading(true);
      setTotalCount(memoryTemplates.length);
      setUploadedCount(0);
      setUploadProgress(
        memoryTemplates.length > 0 ? "이미지 처리 중..." : "메모 저장 중..."
      );

      const imageIds: string[] = [];
      const failedTemplates: string[] = [];

      // 메모리에 있는 이미지들을 서버에 업로드
      for (let i = 0; i < memoryTemplates.length; i++) {
        const template = memoryTemplates[i];
        if (template.canvasData) {
          try {
            const templateLabel =
              TEMPLATES.find((t) => t.name === template.templateName)?.label ||
              template.templateName;
            setUploadProgress(
              `${templateLabel} 업로드 중... (${i + 1}/${
                memoryTemplates.length
              })`
            );
            console.log(`업로드 시작: ${template.templateName}`);

            // 이미 합성된 이미지이므로 바로 blob으로 변환
            const base64Response = await fetch(template.canvasData);
            const blob = await base64Response.blob();

            // 업로드
            const imageId = await uploadConditionImage(
              blob,
              template.templateName,
              lessonId
            );
            imageIds.push(imageId);

            setUploadedCount((prev) => prev + 1);
            console.log(
              `업로드 성공: ${template.templateName}, ID: ${imageId}`
            );
          } catch (error) {
            console.error(`${template.templateName} 업로드 실패:`, error);
            failedTemplates.push(template.templateName);
          }
        }
      }

      // 메모가 변경되었거나, 새 이미지가 있는 경우 저장
      if (memoChanged || imageIds.length > 0) {
        setUploadProgress("컨디션 기록 저장 중...");

        await saveCondition({
          conditionMemo: conditionMemo.trim() || undefined,
          imageIds: imageIds,
        });

        // 초기 메모 값 업데이트 (저장 성공 시)
        setInitialConditionMemo(conditionMemo);

        setUploadProgress("저장 완료!");

        // 결과 메시지 생성
        let message = "";
        if (imageIds.length > 0) {
          message = `${imageIds.length}개의 컨디션 기록이 저장되었습니다.`;
        }
        if (memoChanged) {
          message = message
            ? message + "\n메모가 업데이트되었습니다."
            : "메모가 업데이트되었습니다.";
        }
        if (failedTemplates.length > 0) {
          message += `\n\n실패한 템플릿 (${
            failedTemplates.length
          }개): ${failedTemplates.join(", ")}`;
        }

        setTimeout(() => {
          alert(message);
          onSuccess?.();
          onClose();
        }, 500);
      } else if (failedTemplates.length > 0) {
        alert(
          `모든 이미지 업로드가 실패했습니다.\n실패한 템플릿: ${failedTemplates.join(
            ", "
          )}`
        );
      }
    } catch (error) {
      console.error("Final save error:", error);
      alert(
        error instanceof Error ? error.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      // 로딩 상태 초기화
      setIsUploading(false);
      setUploadProgress("");
      setUploadedCount(0);
      setTotalCount(0);
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
              disabled={isSaving || isDeleting || isUploading}
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
                  const state = templateStates.find(
                    (s) => s.templateName === template.name
                  );
                  const status = state?.status || "empty";

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
                        {status === "memory" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            임시저장
                          </span>
                        )}
                        {status === "server" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            서버저장
                          </span>
                        )}
                        {state?.isCompleted && status !== "empty" && (
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

            {/* 템플릿 미선택 시 안내 메시지 */}
            {!selectedTemplate && (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <div className="text-gray-500">
                  <p className="text-lg font-medium">기록지를 선택해주세요</p>
                </div>
              </div>
            )}

            {/* 선택된 템플릿의 내용 */}
            {selectedTemplate && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {TEMPLATES.find((t) => t.name === selectedTemplate)?.label}
                </h3>

                {/* 저장된 이미지 보기 (서버 저장 또는 메모리 저장) */}
                {(currentTemplateState?.status === "server" &&
                  currentTemplateState.serverImageUrl) ||
                (currentTemplateState?.status === "memory" &&
                  currentTemplateState.canvasData) ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="relative w-full h-96">
                        {currentTemplateState.status === "server" ? (
                          <NextImage
                            src={currentTemplateState.serverImageUrl!}
                            alt="저장된 컨디션 기록"
                            fill
                            className="object-contain"
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={currentTemplateState.canvasData!}
                            alt="그리기 완료된 컨디션 기록"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 캔버스 그리기 인터페이스 */
                  <div className="space-y-4">
                    {/* 템플릿 배경과 캔버스 */}
                    <div 
                      ref={templateContainerRef}
                      className="relative bg-gray-50 rounded-lg p-4 px-5"
                      style={{ height: "400px" }}
                    >
                      {/* 템플릿 배경 */}
                      <div className="absolute inset-4 opacity-30">
                        <NextImage
                          src={
                            TEMPLATES.find((t) => t.name === selectedTemplate)
                              ?.path || ""
                          }
                          alt="템플릿"
                          fill
                          className="object-fill"
                        />
                      </div>

                      {/* 그리기 캔버스 - 템플릿과 정확히 일치하도록 위치 조정 */}
                      <div className="absolute inset-4">
                        <SignatureCanvas
                          key={selectedTemplate}
                          ref={(ref) => {
                            canvasRefs.current[selectedTemplate] = ref;
                          }}
                          canvasProps={{
                            className:
                              "border border-gray-300 rounded relative z-10 bg-transparent cursor-crosshair w-full h-full",
                            style: {
                              width: "100%",
                              height: "100%"
                            },
                          }}
                          backgroundColor="transparent"
                          penColor={penColor}
                          minWidth={penSize}
                          maxWidth={penSize}
                        />
                      </div>
                    </div>

                    {/* 펜 도구 */}
                    <div className="flex flex-wrap gap-4">
                      {/* 펜 색상 */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          펜 색상
                        </label>
                        <div className="flex gap-2">
                          {PEN_COLORS.map((color) => (
                            <button
                              key={color.color}
                              onClick={() => setPenColor(color.color)}
                              className={`w-8 h-8 rounded border-2 ${
                                penColor === color.color
                                  ? "border-gray-800"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: color.color }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 펜 굵기 */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          펜 굵기
                        </label>
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
                      <Button onClick={handleSaveDrawing} variant="outline">
                        그리기 완료
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 메모 입력 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                컨디션 메모 (선택사항)
              </label>
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

              {hasChanges && (
                <Button
                  onClick={handleFinalSave}
                  disabled={isSaving || isUploading}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSaving || isUploading ? "저장 중..." : "저장하기"}
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
                onClick={() =>
                  setDeleteConfirmModal({
                    isOpen: false,
                    templateName: "",
                    message: "",
                  })
                }
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

      {/* 로딩 오버레이 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                컨디션 기록 저장 중
              </h3>
              <p className="text-gray-600 mb-4">{uploadProgress}</p>
              {totalCount > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadedCount / totalCount) * 100}%` }}
                  ></div>
                </div>
              )}
              <p className="text-sm text-gray-500">
                {uploadedCount} / {totalCount} 완료
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
