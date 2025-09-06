"use client";

import React, { useState, useRef, useCallback } from "react";
import NextImage from "next/image";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/app/components/ui/Button";
import useSWRMutation from "swr/mutation";

interface ConditionRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  onSuccess?: () => void;
}

interface CanvasData {
  templateName: string;
  canvasData: string; // base64 data URL
  isCompleted: boolean; // 그리기 완료 여부
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
      type: "CONDITION",
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

export default function ConditionRecordModal({ 
  isOpen, 
  onClose, 
  lessonId, 
  onSuccess 
}: ConditionRecordModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [currentCanvasIndex, setCurrentCanvasIndex] = useState<number>(-1);
  const [conditionMemo, setConditionMemo] = useState<string>("");
  const [penColor, setPenColor] = useState<string>("#000000");
  const [penSize, setPenSize] = useState<number>(4);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [drawingState, setDrawingState] = useState<'drawing' | 'completed'>('drawing');
  const [savedImageData, setSavedImageData] = useState<string | null>(null);

  const canvasRef = useRef<SignatureCanvas>(null);

  // 컨디션 저장 mutation
  const { trigger: saveCondition, isMutating: isSaving } = useSWRMutation(
    `/api/trainer/lesson/${lessonId}/condition`,
    saveConditionRecord
  );

  // 템플릿 선택 (상태 초기화 추가)
  const handleTemplateSelect = useCallback((templateName: string) => {
    // 템플릿 변경 시 그리기 상태 초기화
    setDrawingState('drawing');
    setSavedImageData(null);
    // 현재 캔버스 데이터 저장
    if (currentCanvasIndex >= 0 && canvasRef.current && !canvasRef.current.isEmpty()) {
      const updatedCanvases = [...canvases];
      updatedCanvases[currentCanvasIndex] = {
        templateName: canvases[currentCanvasIndex].templateName,
        canvasData: canvasRef.current.toDataURL(),
        isCompleted: canvases[currentCanvasIndex].isCompleted,
      };
      setCanvases(updatedCanvases);
    }

    // 해당 템플릿이 이미 있는지 확인
    const existingIndex = canvases.findIndex(c => c.templateName === templateName);
    
    if (existingIndex >= 0) {
      // 기존 캔버스로 전환
      setCurrentCanvasIndex(existingIndex);
      setSelectedTemplate(templateName);
      
      const existingCanvas = canvases[existingIndex];
      if (existingCanvas.isCompleted) {
        // 완료된 캔버스인 경우 완료 상태로 설정
        setDrawingState('completed');
        setSavedImageData(existingCanvas.canvasData);
      } else {
        // 작업 중인 캔버스인 경우 드로잉 상태로 설정
        setDrawingState('drawing');
        setSavedImageData(null);
        // 캔버스에 기존 데이터 로드
        setTimeout(() => {
          if (canvasRef.current) {
            canvasRef.current.fromDataURL(existingCanvas.canvasData);
          }
        }, 100);
      }
    } else {
      // 새 캔버스 생성
      const newCanvas: CanvasData = {
        templateName,
        canvasData: "",
        isCompleted: false,
      };
      const newCanvases = [...canvases, newCanvas];
      setCanvases(newCanvases);
      setCurrentCanvasIndex(newCanvases.length - 1);
      setSelectedTemplate(templateName);
      
      // 캔버스 초기화
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.clear();
        }
      }, 100);
    }
  }, [canvases, currentCanvasIndex]);

  // 캔버스 지우기
  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  }, []);

  // 실행 취소
  const handleUndo = useCallback(() => {
    // SignatureCanvas는 undo 기능이 제한적이므로 간단한 구현
    if (canvasRef.current) {
      const canvas = canvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, []);

  // 저장
  const handleSave = async () => {
    try {
      setIsUploading(true);

      // 현재 캔버스 데이터 저장
      if (currentCanvasIndex >= 0 && canvasRef.current && !canvasRef.current.isEmpty()) {
        const updatedCanvases = [...canvases];
        updatedCanvases[currentCanvasIndex] = {
          templateName: canvases[currentCanvasIndex].templateName,
          canvasData: canvasRef.current.toDataURL(),
          isCompleted: canvases[currentCanvasIndex].isCompleted,
        };
        setCanvases(updatedCanvases);
      }

      // 완료되지 않은 캔버스 제거 (완료된 캔버스만 저장)
      const finalCanvases = canvases.filter(canvas => canvas.isCompleted && canvas.canvasData && canvas.canvasData !== "");
      
      if (finalCanvases.length === 0 && !conditionMemo.trim()) {
        alert("최소한 하나의 기록지에 그림을 그리거나 메모를 작성해주세요.");
        return;
      }

      // 이미지들을 Cloudflare에 업로드
      const imageIds: string[] = [];
      
      for (const canvas of finalCanvases) {
        // Canvas 데이터를 Blob으로 변환
        const response = await fetch(canvas.canvasData);
        const blob = await response.blob();
        
        // Cloudflare에 업로드
        const imageId = await uploadConditionImage(blob, canvas.templateName, lessonId);
        imageIds.push(imageId);
      }

      // 컨디션 기록 저장
      await saveCondition({
        conditionMemo: conditionMemo.trim() || undefined,
        imageIds,
      });

      alert("컨디션이 성공적으로 저장되었습니다!");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Save condition error:", error);
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setSelectedTemplate("");
    setCanvases([]);
    setCurrentCanvasIndex(-1);
    setConditionMemo("");
    setPenColor("#000000");
    setPenSize(4);
    onClose();
  };

  const currentTemplate = TEMPLATES.find(t => t.name === selectedTemplate);

  // 현재 캔버스 저장 및 상태 변경
  const handleSaveDrawing = useCallback(async () => {
    if (canvasRef.current && !canvasRef.current.isEmpty() && currentTemplate) {
      try {
        const canvasDataUrl = canvasRef.current.toDataURL();
        // 템플릿과 캔버스를 합성
        const mergedImageData = await mergeTemplateWithCanvas(currentTemplate.path, canvasDataUrl);
        
        setSavedImageData(mergedImageData);
        setDrawingState('completed');
        
        // 캔버스 데이터 업데이트
        if (currentCanvasIndex >= 0) {
          const updatedCanvases = [...canvases];
          updatedCanvases[currentCanvasIndex] = {
            templateName: canvases[currentCanvasIndex].templateName,
            canvasData: mergedImageData,
            isCompleted: true,
          };
          setCanvases(updatedCanvases);
        }
      } catch (error) {
        console.error('Image merging failed:', error);
        alert("이미지 합성 중 오류가 발생했습니다.");
      }
    } else {
      alert("그림을 그려주세요.");
    }
  }, [canvasRef, currentCanvasIndex, canvases, currentTemplate]);

  // 저장된 이미지 삭제
  const handleDeleteDrawing = useCallback(() => {
    setSavedImageData(null);
    setDrawingState('drawing');
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    
    // 캔버스 완료 상태 초기화
    if (currentCanvasIndex >= 0) {
      const updatedCanvases = [...canvases];
      updatedCanvases[currentCanvasIndex] = {
        templateName: canvases[currentCanvasIndex].templateName,
        canvasData: "",
        isCompleted: false,
      };
      setCanvases(updatedCanvases);
    }
  }, [currentCanvasIndex, canvases]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="bg-white w-full h-full p-2 overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">컨디션 기록</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isUploading || isSaving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
        {/* 템플릿 선택 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">기록지 선택</h3>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => handleTemplateSelect(template.name)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  selectedTemplate === template.name
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {template.label}
                {canvases.some(c => c.templateName === template.name && c.isCompleted) && (
                  <div className="text-xs text-green-600 mt-1">✓ 작성됨</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 캔버스 영역 */}
        {selectedTemplate && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {currentTemplate?.label} 작성
            </h3>
            
            {/* 드로잉 도구 - 그리기 상태일 때만 표시 */}
            {drawingState === 'drawing' && (
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              {/* 펜 색상 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">색상:</span>
                {PEN_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.color}
                    onClick={() => setPenColor(colorOption.color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      penColor === colorOption.color ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                    title={colorOption.name}
                  />
                ))}
              </div>

              {/* 펜 굵기 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">굵기:</span>
                {PEN_SIZES.map((sizeOption) => (
                  <button
                    key={sizeOption.size}
                    onClick={() => setPenSize(sizeOption.size)}
                    className={`px-2 py-1 text-xs rounded ${
                      penSize === sizeOption.size
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    {sizeOption.name}
                  </button>
                ))}
              </div>

              {/* 도구 버튼들 */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs"
                >
                  전체 지우기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  className="text-xs"
                >
                  지우개
                </Button>
              </div>
            </div>
            )}

            {/* 캔버스 또는 저장된 이미지 */}
            {drawingState === 'drawing' ? (
              <>
                {/* 캔버스 */}
                <div 
                  className="relative border-2 border-gray-200 rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: `url(${currentTemplate?.path})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                >
                  <SignatureCanvas
                    ref={canvasRef}
                    penColor={penColor}
                    minWidth={penSize}
                    maxWidth={penSize}
                    canvasProps={{
                      className: 'w-full',
                      style: { 
                        background: 'transparent',
                        height: 'calc(100vh - 350px)' // CSS calc로 동적 높이 설정
                      }
                    }}
                  />
                </div>
                
                {/* 저장 버튼 */}
                <div className="flex justify-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveDrawing}
                    className="px-6"
                  >
                    그리기 완료
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* 저장된 이미지 표시 */}
                <div className="relative">
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      ✓ 작성됨
                    </span>
                  </div>
                  <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative w-full" style={{ minHeight: '400px' }}>
                      <NextImage 
                        src={savedImageData || ''} 
                        alt="저장된 그림" 
                        fill
                        style={{ objectFit: 'contain' }}
                        unoptimized // base64 데이터이므로 최적화 비활성화
                      />
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={handleDeleteDrawing}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                      title="삭제하기"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 메모 작성 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">컨디션 메모</h3>
          <textarea
            value={conditionMemo}
            onChange={(e) => setConditionMemo(e.target.value)}
            placeholder="회원의 컨디션에 대한 메모를 작성해주세요..."
            className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 작성된 기록지 목록 */}
        {canvases.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">작성된 기록지</h3>
            <div className="space-y-2">
              {canvases.map((canvas, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {TEMPLATES.find(t => t.name === canvas.templateName)?.label}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect(canvas.templateName)}
                    className="text-xs"
                  >
                    편집
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading || isSaving}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading || isSaving}
          >
            {isUploading || isSaving ? "저장 중..." : "저장하기"}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}