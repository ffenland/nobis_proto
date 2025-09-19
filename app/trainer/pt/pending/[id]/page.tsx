"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { LoadingOverlay } from "@/app/components/ui/LoadingOverlay";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";
import ContractUploadStep from "./components/ContractUploadStep";
import DateSelectionStep from "./components/DateSelectionStep";
import type { GetPendingPtDetailResult } from "@/app/services/trainer/pt.service";
import { formatMinutesToKorean } from "@/app/lib/utils/time.utils";

interface PendingPtDetailPageProps {
  params: Promise<{ id: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// API 업데이트 요청
async function updatePtMutator(
  url: string,
  {
    arg,
  }: {
    arg: { description: string; goals: string; contractImageIds?: string[] };
  }
) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "업데이트에 실패했습니다.");
  }

  return response.json();
}

// PT 확정 요청
async function confirmPtMutator(
  url: string,
  { arg }: { arg: { scheduledAt: string; endAt: string; memo?: string } }
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "PT 확정에 실패했습니다.");
  }

  return response.json();
}

// PT 거절 요청
async function rejectPtMutator(
  url: string,
  { arg }: { arg: { ptId: string; action: string; reason: string } }
) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "PT 거절에 실패했습니다.");
  }

  return response.json();
}

const PendingPtDetailPage = ({ params }: PendingPtDetailPageProps) => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [ptId, setPtId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1); // 1: 정보입력, 2: 계약서, 3: 첫레슨일정
  const [isRedirecting, setIsRedirecting] = useState(false);

  // PT 상태에 따른 문구 헬퍼 함수들
  const getRejectModalTitle = () => {
    return ptDetail?.state === "ACCEPTING"
      ? "취소 이유를 간단하게 입력하세요"
      : "취소 사유를 입력해주세요";
  };

  const getRejectModalMessage = () => {
    const action = ptDetail?.state === "ACCEPTING" ? "취소" : "거절";
    return (
      <>
        <strong>{ptDetail?.member?.user.username || "회원"}</strong>님의{" "}
        <strong>{ptDetail?.ptProduct.title}</strong> 신청을 {action}
        하시겠습니까?
      </>
    );
  };

  const getRejectButtonText = () => {
    return ptDetail?.state === "ACCEPTING" ? "취소하기" : "취소하기";
  };

  const getRejectModalButtonText = () => {
    return ptDetail?.state === "ACCEPTING" ? "취소" : "취소";
  };

  const getRejectPlaceholder = () => {
    return ptDetail?.state === "ACCEPTING"
      ? "취소 이유를 간단하게 입력해주세요. (예: 일정 변경, 기타 사유 등)"
      : "거절 사유를 입력해주세요. (예: 일정 불가, 다른 프로그램 추천 등)";
  };

  const getRejectHelpText = () => {
    return ptDetail?.state === "ACCEPTING"
      ? "간단한 취소 이유를 입력해주세요."
      : "회원에게 전달될 사유이므로 정중하고 명확하게 작성해주세요.";
  };

  // 폼 상태
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [contractImageIds, setContractImageIds] = useState<string[]>([]);

  // 거절 모달 상태
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // params 처리
  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setPtId(resolvedParams.id);
    }
    loadParams();
  }, [params]);

  // PT 상세 정보 조회
  const {
    data: ptDetail,
    error,
    isLoading,
  } = useSWR<GetPendingPtDetailResult>(
    ptId ? `/api/trainer/pt/pending/${ptId}` : null,
    fetcher
  );

  // ptDetail 로드 시 기존 값을 입력 필드에 설정
  useEffect(() => {
    if (ptDetail) {
      if (ptDetail.description) {
        setDescription(ptDetail.description);
      }
      if (ptDetail.goals) {
        setGoals(ptDetail.goals);
      }
      if (ptDetail.contractImage && ptDetail.contractImage.length > 0) {
        setContractImageIds(ptDetail.contractImage.map((img) => img.id));
      }
    }
  }, [ptDetail]);
  // 페이지 첫 로딩 시 회원이 탈퇴한 경우에만 pending 목록으로 리다이렉트
  useEffect(() => {
    if (ptDetail && !ptDetail.member) {
      router.push("/trainer/pt/pending");
    }
  }, [router, ptDetail]); // 빈 의존성 배열로 첫 로딩 시에만 실행

  // PT 정보 업데이트
  const { trigger: updatePt, isMutating: isUpdating } = useSWRMutation(
    ptId ? `/api/trainer/pt/pending/${ptId}` : null,
    updatePtMutator,
    {
      onSuccess: () => {
        mutate(`/api/trainer/pt/pending/${ptId}`);
        setCurrentStep(2);
      },
    }
  );

  // PT 확정 및 첫 레슨 생성
  const { trigger: confirmPt, isMutating: isConfirming } = useSWRMutation(
    ptId ? `/api/trainer/pt/pending/${ptId}` : null,
    confirmPtMutator,
    {
      revalidate: false, // 자동 revalidation 비활성화
      onSuccess: (data) => {
        // 성공 시 리다이렉트 상태 설정 후 PT 상세 페이지로 이동
        setIsRedirecting(true);
        router.push(`/trainer/pt/${ptId}`);
      },
    }
  );

  // PT 거절 처리
  const { trigger: rejectPt, isMutating: isRejecting } = useSWRMutation(
    "/api/trainer/pt/pending",
    rejectPtMutator,
    {
      onSuccess: () => {
        // 성공 시 알림 표시 후 목록 페이지로 이동
        alert("PT 신청이 거절되었습니다.");
        router.push("/trainer/pt/pending");
      },
      onError: (error) => {
        alert(error.message || "PT 거절 처리 중 오류가 발생했습니다.");
      },
    }
  );

  const handleDescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !goals.trim()) {
      alert("설명과 목표를 모두 입력해주세요.");
      return;
    }

    await updatePt({
      description: description.trim(),
      goals: goals.trim(),
      contractImageIds,
    });
  };

  // PT 거절 처리 함수
  const handleRejectPt = async () => {
    if (!rejectReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    if (confirm("이 PT 신청을 거절하시겠습니까?")) {
      await rejectPt({
        ptId,
        action: "reject",
        reason: rejectReason.trim(),
      });
    }
  };

  if (isLoading) {
    return <LoadingPage message="PT 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="PT 정보를 불러올 수 없습니다."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            이전으로
          </Button>
        }
      />
    );
  }

  if (!ptDetail) {
    return null;
  }

  // 회원이 탈퇴한 경우 리다이렉트 처리 중
  if (!ptDetail.member) {
    return null;
  }

  const stepNames = ["목표 및 계획", "계약서 업로드", "첫 수업 일정"];

  return (
    <>
      <div className="container mx-auto px-4 py-2">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="w-full flex-col">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Link href="/trainer/pt/pending">
                <Button variant="outline" className="flex items-center gap-2">
                  ← 승인 대기 목록
                </Button>
              </Link>

              <Button
                type="button"
                variant="danger"
                onClick={() => setShowRejectModal(true)}
                className="px-4"
                disabled={isUpdating || isRejecting}
              >
                {getRejectButtonText()}
              </Button>
            </div>
            <div className="flex flex-col items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">PT 승인</h1>
              <p className="text-gray-600">
                {ptDetail.member.user.username}님의 PT 신청을 처리합니다.
              </p>
            </div>
          </div>

          {/* 단계 표시 */}
          <div className="flex items-center justify-between mb-2">
            {stepNames.map((stepName, index) => (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${
                      currentStep > index + 1
                        ? "bg-green-500 text-white"
                        : currentStep === index + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }
                  `}
                  >
                    {currentStep > index + 1 ? "✓" : index + 1}
                  </div>
                  <span
                    className={`
                    ml-3 text-sm font-medium
                    ${
                      currentStep === index + 1
                        ? "text-blue-600"
                        : currentStep > index + 1
                        ? "text-green-600"
                        : "text-gray-500"
                    }
                  `}
                  >
                    {stepName}
                  </span>
                </div>
                {index < stepNames.length - 1 && (
                  <div className="w-4 h-0.5 bg-gray-200 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PT 정보 카드 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              {ptDetail.member.user.avatarImageId ? (
                <ProfileImagePreview
                  imageId={ptDetail.member.user.avatarImageId}
                  variant="avatar"
                  size="lg"
                  fallback={
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-700">
                        {ptDetail.member.user.username.charAt(0)}
                      </span>
                    </div>
                  }
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-700">
                    {ptDetail.member.user.username.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {ptDetail.member.user.username}
                </h2>
                <p className="text-gray-600">{ptDetail.ptProduct.title}</p>
                <Badge variant="warning" className="mt-1">
                  {ptDetail.state === "ACCEPTING"
                    ? "트레이너 처리중"
                    : "승인대기"}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">총 횟수:</span>
                <br />
                <span className="font-semibold">
                  {ptDetail.ptProduct.totalCount}회
                </span>
              </div>
              <div>
                <span className="text-gray-600">수업 시간:</span>
                <br />
                <span className="font-semibold">
                  {formatMinutesToKorean(ptDetail.ptProduct.time)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">가격:</span>
                <br />
                <span className="font-semibold">
                  {(ptDetail.ptProduct.price / 10000).toFixed(0)}만원
                </span>
              </div>
              <div>
                <span className="text-gray-600">희망 시작일:</span>
                <br />
                <span className="font-semibold">
                  {new Date(ptDetail.startDate).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 컨텐츠 */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                목표 및 세부 계획 입력
              </h3>
              <form onSubmit={handleDescriptionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PT 목표 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="회원의 운동 목표를 입력해주세요. (예: 체중감량, 근력증가, 체력향상 등)"
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    세부 계획 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="구체적인 PT 계획과 프로그램 내용을 입력해주세요."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={5}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isRejecting}
                  >
                    다음 단계
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <ContractUploadStep
            ptId={ptId}
            existingImages={ptDetail?.contractImage || []}
            onImageDeleted={() => mutate(`/api/trainer/pt/pending/${ptId}`)}
            onNext={(contractImageIds) => {
              if (contractImageIds && contractImageIds.length > 0) {
                setContractImageIds(contractImageIds);
              }
              setCurrentStep(3);
            }}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <DateSelectionStep
            selectedProduct={ptDetail.ptProduct}
            onNext={async (
              _startDate,
              firstLessonScheduledAt,
              firstLessonEndAt,
              memo
            ) => {
              await confirmPt({
                scheduledAt: firstLessonScheduledAt,
                endAt: firstLessonEndAt,
                memo: memo,
              });
            }}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </div>

      {/* 거절 사유 입력 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {getRejectModalTitle()}
                </h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isRejecting}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    {getRejectModalMessage()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ptDetail?.state === "ACCEPTING"
                      ? "취소 이유"
                      : "거절 사유"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={getRejectPlaceholder()}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    disabled={isRejecting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getRejectHelpText()}
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                    }}
                    disabled={isRejecting}
                    className="flex-1"
                  >
                    닫기
                  </Button>
                  <Button
                    onClick={handleRejectPt}
                    disabled={isRejecting || !rejectReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isRejecting ? "처리 중..." : getRejectModalButtonText()}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 오버레이 */}
      <LoadingOverlay
        isLoading={isUpdating || isConfirming || isRejecting || isRedirecting}
        message={
          isUpdating
            ? "PT 정보를 업데이트하는 중..."
            : isConfirming
            ? "PT를 확정하고 첫 수업을 등록하는 중..."
            : isRejecting
            ? "PT 신청을 거절하는 중..."
            : isRedirecting
            ? "페이지 이동 중..."
            : "처리 중..."
        }
      />
    </>
  );
};

export default PendingPtDetailPage;
