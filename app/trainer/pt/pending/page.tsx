"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";
import type {
  GetTrainerPendingPtsResult,
  RejectPtResult,
  CreateLessonWithPtApprovalResult,
} from "@/app/services/trainer/pt.service";
import ApprovalLessonModal from "./ApprovalLessonModal";

// PT 액션 타입 정의 (API route의 body 타입과 일치)
type PtActionPayload =
  | { ptId: string; action: "reject"; reason: string }
  | {
      ptId: string;
      action: "approveWithLesson";
      lessonData: {
        scheduledAt: string;
        endAt: string;
        memo?: string;
      };
    };

// API Response 타입
type PtActionResponse = {
  success: boolean;
  action: "reject" | "approveWithLesson";
  result: RejectPtResult | CreateLessonWithPtApprovalResult;
};

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// SWR mutator for PATCH requests
async function patchMutator(
  url: string,
  { arg }: { arg: PtActionPayload }
): Promise<PtActionResponse> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "요청 처리 중 오류가 발생했습니다.");
  }

  return response.json();
}

// 모달 상태 타입
type ModalState =
  | { type: "closed" }
  | { type: "detail"; pt: GetTrainerPendingPtsResult[number] }
  | { type: "reject"; pt: GetTrainerPendingPtsResult[number] }
  | { type: "approveWithLesson"; pt: GetTrainerPendingPtsResult[number] };

const TrainerPendingPtListPage = () => {
  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });
  const [rejectReason, setRejectReason] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const { mutate } = useSWRConfig();

  // Toast 함수
  const showToast = (
    type: "success" | "error" | "warning" | "info",
    message: string
  ) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Pending PT 목록 데이터 fetching
  const {
    data: pendingPts,
    error,
    isLoading,
  } = useSWR<GetTrainerPendingPtsResult>("/api/trainer/pt/pending", fetcher);

  // PT 승인/거절 mutation
  const { trigger: handlePtAction, isMutating } = useSWRMutation<
    PtActionResponse,
    Error,
    string,
    PtActionPayload
  >("/api/trainer/pt/pending", patchMutator, {
    onSuccess: (data, _key, _config) => {
      // 성공 시 데이터 재조회 및 모달 닫기
      mutate("/api/trainer/pt/pending");
      mutate("/api/trainer/dashboard"); // 대시보드도 업데이트

      // 성공 메시지 표시 (응답 데이터의 action 사용)
      const action = data.action;
      let successMessage = "PT 처리가 완료되었습니다.";

      if (action === "approveWithLesson") {
        successMessage = "PT가 승인되고 첫 수업이 등록되었습니다.";
      } else if (action === "reject") {
        successMessage = "PT 신청이 거절되었습니다.";
      }

      showToast("success", successMessage);
      setModalState({ type: "closed" });
      setRejectReason("");
    },
    onError: (error) => {
      console.error("PT 처리 실패:", error);

      // 에러 타입에 따른 메시지 분기
      let errorMessage = "PT 처리 중 오류가 발생했습니다.";

      if (error.message.includes("권한이 없습니다")) {
        errorMessage = "권한이 없습니다. 다시 로그인해주세요.";
        showToast("error", errorMessage);
        setModalState({ type: "closed" });
      } else if (error.message.includes("찾을 수 없습니다")) {
        errorMessage = "해당 PT를 찾을 수 없습니다.";
        showToast("error", errorMessage);
        setModalState({ type: "closed" });
      } else {
        // 기타 에러
        errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
        showToast("error", errorMessage);
        setModalState({ type: "closed" });
      }
    },
  });

  // PT 승인 + 레슨 생성 처리
  const handleApproveWithLesson = async (lessonData: {
    scheduledAt: string;
    endAt: string;
    memo?: string;
  }) => {
    if (modalState.type !== "approveWithLesson") return;

    try {
      await handlePtAction({
        ptId: modalState.pt.id,
        action: "approveWithLesson",
        lessonData,
      });
    } catch (error) {
      console.error("PT 승인 및 레슨 생성 실패:", error);
      throw error;
    }
  };

  // PT 거절 처리
  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    if (modalState.type !== "reject") return;

    if (confirm("이 PT 신청을 거절하시겠습니까?")) {
      handlePtAction({
        ptId: modalState.pt.id,
        action: "reject",
        reason: rejectReason.trim(),
      });
    }
  };

  // 회원 연락하기
  const handleCallMember = (mobile: string) => {
    if (mobile) {
      window.location.href = `tel:${mobile}`;
    }
  };

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="승인 대기 PT 목록을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <ErrorMessage
        message="승인 대기 PT 목록을 불러올 수 없습니다."
        action={
          <Button
            variant="outline"
            onClick={() => mutate("/api/trainer/pt/pending")}
          >
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* 메인 페이지 */}
      <div className="lg:flex lg:gap-6">
        <div className="lg:flex-1 lg:max-w-4xl">
          {/* 헤더 */}
          <div className="mb-6">
            <Link href="/trainer" className="inline-block mb-4">
              <Button variant="outline" size="sm">
                ← 대시보드로 돌아가기
              </Button>
            </Link>
            <PageHeader
              title="승인 대기 PT 목록"
              subtitle={`총 ${
                pendingPts?.length || 0
              }개의 신청이 승인을 기다리고 있습니다`}
            />
          </div>

          {/* PT 목록 */}
          {pendingPts && pendingPts.length > 0 ? (
            <div className="space-y-4">
              {pendingPts.map((pt) => (
                <Card
                  key={pt.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setModalState({ type: "detail", pt })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        {/* 회원 아바타 */}
                        <div className="flex-shrink-0">
                          {pt.member?.user.avatarImageId ? (
                            <ProfileImagePreview
                              imageId={pt.member.user.avatarImageId}
                              variant="avatar"
                              size="sm"
                              fallback={
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-lg font-bold text-gray-700">
                                    {pt.member.user.username.charAt(0)}
                                  </span>
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-gray-700">
                                {pt.member?.user.username.charAt(0) || "?"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* PT 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {pt.member?.user.username || "알 수 없음"}
                            </h3>
                            <Badge variant="warning" className="text-xs">
                              승인대기
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {pt.ptProduct.title}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              신청일:{" "}
                              {new Date(pt.createdAt).toLocaleDateString(
                                "ko-KR"
                              )}
                            </span>
                            <span>
                              희망시작일:{" "}
                              {new Date(pt.startDate).toLocaleDateString(
                                "ko-KR"
                              )}
                            </span>
                            <span>
                              {(pt.ptProduct.price / 10000).toFixed(0)}만원
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 화살표 아이콘 */}
                      <div className="flex-shrink-0">
                        <span className="text-gray-400">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* 빈 상태 */
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  승인 대기 중인 PT 신청이 없습니다
                </h3>
                <p className="text-sm text-gray-600">
                  새로운 PT 신청이 들어오면 여기에 표시됩니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {modalState.type === "detail" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">PT 신청 상세</h2>
                <button
                  onClick={() => setModalState({ type: "closed" })}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isMutating}
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

              <div className="space-y-6">
                {/* 회원 정보 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    회원 정보
                  </h3>
                  <div className="flex items-center gap-4 mb-3">
                    {modalState.pt.member?.user.avatarImageId ? (
                      <ProfileImagePreview
                        imageId={modalState.pt.member.user.avatarImageId}
                        variant="avatar"
                        size="md"
                        fallback={
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-gray-700">
                              {modalState.pt.member.user.username.charAt(0)}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-700">
                          {modalState.pt.member?.user.username.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {modalState.pt.member?.user.username || "알 수 없음"}
                      </p>
                      <p className="text-sm text-gray-600">
                        📱 {modalState.pt.member?.user.mobile || "번호 없음"}
                      </p>
                    </div>
                  </div>

                  {modalState.pt.member?.user.mobile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const mobile = modalState.pt.member?.user.mobile;
                        if (mobile) {
                          handleCallMember(mobile);
                        }
                      }}
                      className="mb-4"
                    >
                      📞 회원에게 전화하기
                    </Button>
                  )}
                </div>

                {/* PT 상품 정보 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    PT 상품 정보
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {modalState.pt.ptProduct.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">총 횟수:</span>{" "}
                        {modalState.pt.ptProduct.totalCount}회
                      </div>
                      <div>
                        <span className="text-gray-600">가격:</span>{" "}
                        {(modalState.pt.ptProduct.price / 10000).toFixed(0)}만원
                      </div>
                    </div>
                  </div>
                </div>

                {/* 운동 목표 */}
                {modalState.pt.goals && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      운동 목표
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="space-y-1">
                        {modalState.pt.goals.split(",").map(
                          (goal, index) =>
                            goal.trim() && (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-blue-500">✓</span>
                                <span className="text-sm text-blue-800">
                                  {goal.trim()}
                                </span>
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 기타 정보 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    신청 정보
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      신청일:{" "}
                      {new Date(modalState.pt.createdAt).toLocaleString(
                        "ko-KR"
                      )}
                    </div>
                    <div>
                      희망 시작일:{" "}
                      {new Date(modalState.pt.startDate).toLocaleDateString(
                        "ko-KR"
                      )}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="space-y-3 pt-4 border-t">
                  <Button
                    onClick={() =>
                      setModalState({
                        type: "approveWithLesson",
                        pt: modalState.pt,
                      })
                    }
                    disabled={isMutating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isMutating ? "처리 중..." : "승인 및 첫 수업 등록"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setModalState({ type: "reject", pt: modalState.pt })
                    }
                    disabled={isMutating}
                    className="w-full"
                  >
                    거절하기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거절 사유 입력 모달 */}
      {modalState.type === "reject" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">PT 신청 거절</h2>
                <button
                  onClick={() =>
                    setModalState({ type: "detail", pt: modalState.pt })
                  }
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isMutating}
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
                    <strong>
                      {modalState.pt.member?.user.username || "회원"}
                    </strong>
                    님의
                    <strong> {modalState.pt.ptProduct.title}</strong> 신청을
                    거절하시겠습니까?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거절 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="거절 사유를 입력해주세요. (예: 일정 불가, 다른 프로그램 추천 등)"
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    disabled={isMutating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    회원에게 전달될 사유이므로 정중하고 명확하게 작성해주세요.
                  </p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setModalState({ type: "detail", pt: modalState.pt })
                    }
                    disabled={isMutating}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isMutating || !rejectReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isMutating ? "처리 중..." : "거절 확정"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 승인 + 레슨 생성 모달 */}
      {modalState.type === "approveWithLesson" && (
        <ApprovalLessonModal
          pt={modalState.pt}
          isLoading={isMutating}
          onApprove={handleApproveWithLesson}
          onCancel={() => setModalState({ type: "detail", pt: modalState.pt })}
        />
      )}

      {/* Toast 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[60] animate-slide-in-top">
          <div
            className={`
            min-w-80 max-w-md p-4 rounded-lg shadow-lg border
            ${
              toastMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : toastMessage.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : toastMessage.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }
          `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toastMessage.type === "success" && (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toastMessage.type === "error" && (
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toastMessage.type === "warning" && (
                  <svg
                    className="w-5 h-5 text-amber-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toastMessage.type === "info" && (
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{toastMessage.message}</p>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrainerPendingPtListPage;
