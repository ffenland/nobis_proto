// app/trainer/pending-applications/page.tsx (완전 새 버전)
"use client";

import { useState } from "react";
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

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const PendingApplicationsPage = () => {
  const [selectedPt, setSelectedPt] = useState<
    ITrainerPendingPts[number] | null
  >(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 승인 대기 PT 목록 조회
  const {
    data: pendingApplications,
    error,
    isLoading,
    mutate,
  } = useSWR<ITrainerPendingPts>("/api/trainer/pending-applications", fetcher);

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
      weekday: "short",
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
    if (!selectedPt) return;

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
    if (!selectedPt) return;

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
      {/* 헤더 */}
      <PageHeader
        title="PT 신청 승인"
        subtitle={`${pendingApplications?.length || 0}건의 승인 대기 중인 신청`}
      />

      {/* 승인 대기 목록 */}
      {!pendingApplications || pendingApplications.length === 0 ? (
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
          {pendingApplications.map((pt) => (
            <Card key={pt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {pt.member.user.username} 회원
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{formatDate(pt.createdAt)} 신청</span>
                    </div>
                  </div>
                  <Badge variant="warning">승인 대기</Badge>
                </div>

                {/* PT 프로그램 정보 */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {pt.ptProduct.title}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">총 횟수:</span>{" "}
                      <span className="font-medium">
                        {pt.ptProduct.totalCount}회
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">회당 시간:</span>{" "}
                      <span className="font-medium">
                        {pt.ptProduct.time}시간
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

                {/* 스케줄 정보 */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">운동 일정</h4>

                  {pt.isRegular ? (
                    // 정기 스케줄
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        정기 스케줄 (주 {pt.weekTimes.length}회)
                      </div>
                      <div className="text-sm text-blue-800">
                        {pt.weekTimes.map((wt, index) => (
                          <span key={index}>
                            {getKoreanDayName(wt.weekDay)}요일{" "}
                            {formatTime(wt.startTime)}-{formatTime(wt.endTime)}
                            {index < pt.weekTimes.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // 수시 스케줄
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-green-900 mb-2">
                        수시 스케줄 ({pt.ptSchedule.length}회 예약)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
                        {pt.ptSchedule.slice(0, 4).map((schedule, index) => (
                          <div key={index}>
                            {formatDate(schedule.date)}{" "}
                            {formatTime(schedule.startTime)}-
                            {formatTime(schedule.endTime)}
                          </div>
                        ))}
                        {pt.ptSchedule.length > 4 && (
                          <div className="text-green-700">
                            외 {pt.ptSchedule.length - 4}개 일정...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
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
          ))}
        </div>
      )}

      {/* 승인 확인 모달 */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
      >
        <ModalHeader onClose={() => setShowApprovalModal(false)}>
          PT 신청 승인
        </ModalHeader>
        <ModalContent>
          {selectedPt && (
            <div className="space-y-4">
              <p className="text-gray-700">
                <strong>{selectedPt.member?.user.username}</strong> 회원의 PT
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
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 승인 시 자동으로 모든 수업 일정이 생성되며, 회원이 즉시
                  수업을 시작할 수 있습니다.
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

      {/* 거절 모달 */}
      <Modal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
      >
        <ModalHeader onClose={() => setShowRejectionModal(false)}>
          PT 신청 거절
        </ModalHeader>
        <ModalContent>
          {selectedPt && (
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

export default PendingApplicationsPage;
