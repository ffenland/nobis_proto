"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";
import type {
  GetTrainerPendingPtsResult,
} from "@/app/services/trainer/pt.service";

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());


const TrainerPendingPtListPage = () => {
  // Pending PT 목록 데이터 fetching
  const {
    data: pendingPts,
    error,
    isLoading,
  } = useSWR<GetTrainerPendingPtsResult>("/api/trainer/pt/pending", fetcher);

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
            onClick={() => window.location.reload()}
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
                <Link key={pt.id} href={`/trainer/pt/pending/${pt.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
                </Link>
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
    </>
  );
};

export default TrainerPendingPtListPage;
