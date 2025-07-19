// app/trainer/pending-applications/page.tsx (기존 코드 + 충돌 체크 추가)
"use client";

import { useState, useEffect } from "react"; // useEffect 추가
import useSWR from "swr";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/app/components/ui/Modal";
import { Textarea } from "@/app/components/ui/Input";
import { ITrainerPendingPts } from "@/app/lib/services/trainer.service";
import { type IConflictingMember } from "@/app/lib/services/schedule-conflict.service"; // 🚨 NEW
import { formatMinutesToKorean } from "@/app/lib/utils/time.utils";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const PendingPtsPage = () => {
  const [selectedPt, setSelectedPt] = useState<
    ITrainerPendingPts[number] | null
  >(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 🚨 NEW: 충돌 경고 상태 추가 (타입 명시)
  const [conflictWarnings, setConflictWarnings] = useState<
    Record<string, IConflictingMember[]>
  >({});
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // 승인 대기 PT 목록 조회
  const {
    data: pendingPts,
    error,
    isLoading,
    mutate,
  } = useSWR<ITrainerPendingPts>("/api/trainer/pt/pending", fetcher);

  // 🚨 NEW: PT별 충돌 체크 (useEffect)
  useEffect(() => {
    const checkConflicts = async () => {
      if (!pendingPts || pendingPts.length === 0) return;

      setIsCheckingConflicts(true);
      const warnings: Record<string, IConflictingMember[]> = {};

      try {
        for (const pt of pendingPts) {
          try {
            const response = await fetch(
              "/api/trainer/schedule-conflict-check",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ptId: pt.id }),
              }
            );

            if (response.ok) {
              const result: {
                success: boolean;
                hasConflict: boolean;
                conflictingMembers: IConflictingMember[];
              } = await response.json();

              if (result.hasConflict) {
                warnings[pt.id] = result.conflictingMembers;
              }
            }
          } catch (error) {
            console.error(`PT ${pt.id} 충돌 체크 실패:`, error);
          }
        }

        setConflictWarnings(warnings);
      } catch (error) {
        console.error("충돌 체크 전체 실패:", error);
      } finally {
        setIsCheckingConflicts(false);
      }
    };

    checkConflicts();
  }, [pendingPts]);

  // 🚨 NEW: 충돌 경고 렌더링 함수
  const renderConflictWarning = (ptId: string) => {
    const conflicts = conflictWarnings[ptId];
    if (!conflicts || conflicts.length === 0) return null;

    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 mt-1">⚠️</div>
          <div className="space-y-3 flex-1">
            <h4 className="font-medium text-amber-900">
              스케줄 충돌 가능성 경고
            </h4>
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="bg-amber-100 p-3 rounded border border-amber-300"
              >
                <div className="text-sm text-amber-800 space-y-2">
                  <p className="font-medium">
                    <strong>{conflict.memberName}</strong>님의{" "}
                    {conflict.ptTitle} 수업과 겹칩니다
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-amber-700">완료율:</span>
                      <span className="font-medium ml-1">
                        {Math.round(conflict.completionRate * 100)}% (
                        {conflict.remainingSessions}회 남음)
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700">마지막 수업:</span>
                      <span className="font-medium ml-1">
                        {new Date(
                          conflict.lastSessionDate
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700">겹치는 요일:</span>
                      <span className="font-medium ml-1">
                        {conflict.conflictingDays.join(", ")}요일
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700">겹치는 시간:</span>
                      <span className="font-medium ml-1">
                        {conflict.conflictingTimes.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-amber-200 p-2 rounded border border-amber-400">
                    <strong className="text-amber-900">💡 확인 필요:</strong>
                    <span className="ml-1 text-amber-800">
                      해당 회원의 수업 연장 여부를 먼저 확인해주세요. 연장 시
                      일정 조정이 필요할 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 기존 함수들 (그대로 유지)
  // 시간 포맷 함수
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 요일 한글 변환
  const getKoreanDayName = (weekDay: string) => {
    const dayMap: Record<string, string> = {
      MON: "월",
      TUE: "화",
      WED: "수",
      THU: "목",
      FRI: "금",
      SAT: "토",
      SUN: "일",
    };
    return dayMap[weekDay] || weekDay;
  };

  // PT 승인 처리
  const handleApprove = async () => {
    if (!selectedPt || !selectedPt.member) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/trainer/pt-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptId: selectedPt.id,
          action: "approve",
        }),
      });

      if (!response.ok) {
        throw new Error("승인 처리 실패");
      }

      const result = await response.json();

      // 성공 메시지
      alert(
        `${selectedPt.member.user.username} 회원의 PT 신청이 승인되었습니다!`
      );

      // 목록 새로고침
      await mutate();

      // 모달 닫기
      setShowApprovalModal(false);
      setSelectedPt(null);
    } catch (error) {
      console.error("승인 처리 오류:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // PT 거절 처리
  const handleReject = async () => {
    if (!selectedPt || !selectedPt.member) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/trainer/pt-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptId: selectedPt.id,
          action: "reject",
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error("거절 처리 실패");
      }

      const result = await response.json();

      // 성공 메시지
      alert(
        `${selectedPt.member.user.username} 회원의 PT 신청이 거절되었습니다.`
      );

      // 목록 새로고침
      await mutate();

      // 모달 닫기 및 초기화
      setShowRejectionModal(false);
      setSelectedPt(null);
      setRejectionReason("");
    } catch (error) {
      console.error("거절 처리 오류:", error);
      alert("거절 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 승인 모달 열기
  const openApprovalModal = (pt: ITrainerPendingPts[number]) => {
    setSelectedPt(pt);
    setShowApprovalModal(true);
  };

  // 거절 모달 열기
  const openRejectionModal = (pt: ITrainerPendingPts[number]) => {
    setSelectedPt(pt);
    setShowRejectionModal(true);
  };

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="승인 대기 목록을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout maxWidth="lg">
        <ErrorMessage
          message="승인 대기 목록을 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      {/* 헤더 (충돌 체크 상태 표시 추가) */}
      <PageHeader
        title="PT 신청 승인"
        subtitle={`${pendingPts?.length || 0}건의 승인 대기 중인 신청${
          isCheckingConflicts ? " • 충돌 체크 중..." : ""
        }`}
      />

      {/* 승인 대기 목록 */}
      {!pendingPts || pendingPts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              승인 대기 중인 PT 신청이 없습니다
            </h3>
            <p className="text-gray-600">모든 신청이 처리되었습니다!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPts.map((pt) => {
            if (!pt.member) {
              return null; // member가 null인 경우 렌더링하지 않음
            }
            return (
              <Card key={pt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* 🚨 NEW: 충돌 경고 표시 (맨 위에) */}
                  {renderConflictWarning(pt.id)}

                  {/* 기존 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pt.member.user.username} 회원
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{formatDate(pt.createdAt)} 신청</span>
                        {/* 🚨 NEW: 충돌 경고 뱃지 */}
                        {conflictWarnings[pt.id] &&
                          conflictWarnings[pt.id].length > 0 && (
                            <Badge variant="warning" className="text-xs">
                              ⚠️ 충돌 위험
                            </Badge>
                          )}
                      </div>
                    </div>
                    <Badge variant="warning">승인 대기</Badge>
                  </div>

                  {/* 기존 PT 프로그램 정보 (그대로 유지) */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {pt.ptProduct.title}
                    </h4>
                    <div className="flex flex-col gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">총 횟수:</span>{" "}
                        <span className="font-medium">
                          {pt.ptProduct.totalCount}회
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">회당 시간:</span>{" "}
                        <span className="font-medium">
                          {formatMinutesToKorean(pt.ptProduct.time)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">가격:</span>{" "}
                        <span className="font-medium">
                          {pt.ptProduct.price.toLocaleString()}원
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">시작일:</span>{" "}
                        <span className="font-medium">
                          {formatDate(pt.startDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 기존 액션 버튼들 (그대로 유지) */}
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => openApprovalModal(pt)}
                      className="flex-1"
                    >
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openRejectionModal(pt)}
                      className="flex-1"
                    >
                      거절
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 기존 승인 확인 모달 (충돌 경고 추가) */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
      >
        <ModalHeader onClose={() => setShowApprovalModal(false)}>
          PT 신청 승인
        </ModalHeader>
        <ModalContent>
          {selectedPt && selectedPt.member && (
            <div className="space-y-4">
              {/* 🚨 NEW: 승인 모달에도 충돌 경고 표시 */}
              {renderConflictWarning(selectedPt.id)}

              <p className="text-gray-700">
                <strong>{selectedPt.member.user.username}</strong> 회원의 PT
                신청을 승인하시겠습니까?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">프로그램:</span>{" "}
                    {selectedPt.ptProduct.title}
                  </div>
                  <div>
                    <span className="text-gray-600">총 횟수:</span>{" "}
                    {selectedPt.ptProduct.totalCount}회
                  </div>
                  <div>
                    <span className="text-gray-600">시작일:</span>{" "}
                    {formatDate(selectedPt.startDate)}
                  </div>
                </div>
              </div>

              {/* PT 일정 정보 */}
              {selectedPt.ptRecord && selectedPt.ptRecord.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-3">
                    예정된 수업 일정
                  </h5>
                  <div className="space-y-2">
                    {selectedPt.ptRecord.map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between text-sm bg-white p-2 rounded border"
                      >
                        <span className="text-gray-700">{index + 1}회차</span>
                        <span className="font-medium text-blue-700">
                          {formatDate(record.ptSchedule.date.toString())}{" "}
                          {formatTime(record.ptSchedule.startTime)} -{" "}
                          {formatTime(record.ptSchedule.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  💡 승인 후, 결제와 관련해서는 <br /> 회원과 직접 연락해서
                  진행하세요.
                </p>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowApprovalModal(false)}
            disabled={isProcessing}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            loading={isProcessing}
          >
            승인하기
          </Button>
        </ModalFooter>
      </Modal>

      {/* 기존 거절 모달 (그대로 유지) */}
      <Modal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
      >
        <ModalHeader onClose={() => setShowRejectionModal(false)}>
          PT 신청 거절
        </ModalHeader>
        <ModalContent>
          {selectedPt && selectedPt.member && (
            <div className="space-y-4">
              <p className="text-gray-700">
                <strong>{selectedPt.member.user.username}</strong> 회원의 PT
                신청을 거절하시겠습니까?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">프로그램:</span>{" "}
                    {selectedPt.ptProduct.title}
                  </div>
                  <div>
                    <span className="text-gray-600">신청일:</span>{" "}
                    {formatDate(selectedPt.createdAt)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  거절 사유 (선택사항)
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="거절 사유를 입력해주세요..."
                  rows={3}
                />
              </div>

              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ 거절 시 해당 PT는 REJECTED 상태로 변경되며, 회원 목록에서
                  숨겨집니다.
                </p>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowRejectionModal(false)}
            disabled={isProcessing}
          >
            취소
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            loading={isProcessing}
          >
            거절하기
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
};

export default PendingPtsPage;
