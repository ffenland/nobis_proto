"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Input";
import {
  CheckCircle,
  User,
  Calendar,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  FitnessCentersForPtApply,
  TrainersWithPtProgramsByCenter,
} from "@/app/services/member/pt/pt.service";
import LoadingOverlay from "./LoadingOverlay";

interface ConfirmationStepProps {
  selectedCenter: FitnessCentersForPtApply[number];
  selectedPt: TrainersWithPtProgramsByCenter[number]["ptProducts"][number];
  selectedTrainer: TrainersWithPtProgramsByCenter[number];
  selectedStartDate: Date;
  message: string;
  setMessage: (message: string) => void;
  onGoBack: () => void;
}

const ConfirmationStep = ({
  selectedCenter,
  selectedPt,
  selectedTrainer,
  selectedStartDate,
  message,
  setMessage,
  onGoBack,
}: ConfirmationStepProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 신청 처리
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // PT 신청 API 호출 (단순화된 버전)
      const response = await fetch("/api/member/new-pt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerId: selectedCenter.id,
          ptProductId: selectedPt.id,
          trainerId: selectedTrainer.id,
          startDate: selectedStartDate.toISOString(),
          description: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "PT 신청에 실패했습니다.");
      }

      const result = await response.json();

      // 성공 시 PT 상세 페이지로 이동
      // 로딩 상태를 유지하면서 페이지 이동
      router.push(`/member/pt/`);
      // setIsSubmitting(false)를 호출하지 않음 - 페이지 이동 중 로딩 상태 유지
    } catch (err) {
      // 에러 발생 시에만 로딩 상태 해제
      console.error("PT 신청 실패:", err);
      setError(
        err instanceof Error ? err.message : "PT 신청 중 오류가 발생했습니다."
      );
      setIsSubmitting(false); // 에러 시에만 다시 시도할 수 있도록 버튼 활성화
    }
  };

  // 유효기간 계산
  const endDate = addDays(selectedStartDate, selectedPt.expiration_period);

  return (
    <div className="space-y-6">
      {/* 성공 아이콘 */}
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-900">
          신청 내용을 확인해주세요
        </h2>
        <p className="text-gray-600 mt-2">
          아래 내용을 확인하고 최종 신청을 완료해주세요.
        </p>
      </div>

      {/* 신청 정보 요약 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">PT 신청 정보</h3>

          <div className="space-y-4">
            {/* 센터 정보 */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">센터</p>
                <p className="font-medium text-gray-900">
                  {selectedCenter.title}
                </p>
              </div>
            </div>

            {/* PT 프로그램 정보 */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">PT 프로그램</p>
                <p className="font-medium text-gray-900">{selectedPt.title}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    총 {selectedPt.totalCount}회
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    회당 {selectedPt.time}분
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {selectedPt.price.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 트레이너 정보 */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">담당 트레이너</p>
                <p className="font-medium text-gray-900">
                  {selectedTrainer.user.username} 트레이너
                </p>
              </div>
            </div>

            {/* 시작일 및 유효기간 */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">시작일 / 종료일</p>
                <p className="font-medium text-gray-900">
                  {format(selectedStartDate, "yyyy년 M월 d일", { locale: ko })}{" "}
                  ~ {format(endDate, "yyyy년 M월 d일", { locale: ko })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedPt.expiration_period}일 이내 모든 수업 완료 필요
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메시지 입력 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            트레이너에게 전달할 메시지 (선택)
          </h3>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="운동 목표, 특별한 요청사항, 건강 상태 등을 자유롭게 작성해주세요."
            rows={4}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-blue-800 font-medium">
              신청 전 확인사항
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 신청 완료 후 트레이너님이 신청을 확인하고 승인합니다.</li>
              <li>• 구체적인 수업 일정은 트레이너님과 상의하여 결정됩니다.</li>
              <li>• 승인 전까지는 취소가 가능합니다.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-medium">신청 실패</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onGoBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          이전 단계
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              신청 중...
            </span>
          ) : (
            "PT 신청하기"
          )}
        </Button>
      </div>

      {/* 로딩 오버레이 */}
      <LoadingOverlay
        isVisible={isSubmitting}
        message="PT 신청을 처리하고 있습니다..."
      />
    </div>
  );
};

export default ConfirmationStep;
