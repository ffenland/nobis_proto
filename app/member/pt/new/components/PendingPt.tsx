"use client";

import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import { PageHeader, PageLayout } from "@/app/components/ui/Dropdown";
import { IPendingPt } from "@/app/lib/services/pt-apply.service";
import { useRouter } from "next/navigation";

const PendingPt = ({ pendingPt }: { pendingPt: IPendingPt }) => {
  const router = useRouter();
  return (
    <PageLayout maxWidth="md">
      <PageHeader title="PT 신청" subtitle="승인 대기 중인 신청이 있습니다" />

      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* 경고 아이콘 */}
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* 메인 메시지 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                승인 대기 중인 PT 신청이 있습니다
              </h2>
              <p className="text-gray-600">
                새로운 PT를 신청하려면 기존 신청을 먼저 취소해주세요.
              </p>
            </div>

            {/* 기존 신청 정보 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <h3 className="font-medium text-amber-900 mb-3">
                현재 승인 대기 중인 신청
              </h3>
              <div className="space-y-2 text-sm text-amber-800">
                <div className="flex justify-between">
                  <span className="text-amber-700">프로그램:</span>
                  <span className="font-medium">{pendingPt.ptTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">트레이너:</span>
                  <span className="font-medium">{pendingPt.trainerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">총 횟수:</span>
                  <span className="font-medium">{pendingPt.totalCount}회</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">가격:</span>
                  <span className="font-medium">
                    {pendingPt.price.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">신청일:</span>
                  <span className="font-medium">
                    {new Date(pendingPt.appliedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/member/pt/requests")}
                className="flex-1 sm:flex-none"
              >
                신청 현황 관리
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push("/member/dashboard")}
                className="flex-1 sm:flex-none"
              >
                대시보드로 이동
              </Button>
            </div>

            {/* 도움말 */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              💡 <strong>도움말:</strong> 기존 신청을 취소하려면 &ldquo;신청
              현황 관리&rdquo;에서 해당 신청을 찾아 취소 버튼을 클릭하세요.
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default PendingPt;
