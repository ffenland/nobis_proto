// app/member/pt/page.tsx (완전 새 버전)
"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { Input } from "@/app/components/ui/Input";
import { IMemberPtList } from "@/app/lib/services/member.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const MemberPtListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "completed"
  >("all");

  // PT 목록 조회
  const {
    data: ptList,
    error,
    isLoading,
    mutate,
  } = useSWR<IMemberPtList>("/api/member/pt-list", fetcher);

  // PT 상태 결정 (PtState 기반)
  const getPtStatus = (pt: IMemberPtList[number]) => {
    if (pt.isPending) {
      return { text: "승인대기", variant: "warning" as const };
    } else if (pt.isCompleted) {
      return { text: "완료", variant: "default" as const };
    } else if (pt.isConfirmed) {
      return { text: "진행중", variant: "success" as const };
    } else {
      return { text: "알 수 없음", variant: "default" as const };
    }
  };

  // 필터링된 PT 목록
  const filteredPtList =
    ptList?.filter((pt) => {
      // 검색 필터
      const matchesSearch =
        searchQuery === "" ||
        pt.ptProduct.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pt.trainer?.user.username || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // 상태 필터
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && pt.isPending) ||
        (statusFilter === "confirmed" && pt.isConfirmed && !pt.isCompleted) ||
        (statusFilter === "completed" && pt.isCompleted);

      return matchesSearch && matchesStatus;
    }) || [];

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="PT 목록을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout maxWidth="lg">
        <ErrorMessage
          message="PT 목록을 불러올 수 없습니다."
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
        title="내 PT"
        subtitle={`총 ${ptList?.length || 0}개의 PT`}
        action={
          <Link href="/member/pt/new">
            <Button variant="primary">PT 신청</Button>
          </Link>
        }
      />

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          {/* 검색바 */}
          <Input
            placeholder="PT 프로그램 또는 트레이너 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* 상태 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "pending"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              승인대기
            </button>
            <button
              onClick={() => setStatusFilter("confirmed")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "confirmed"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              진행중
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "completed"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              완료
            </button>
          </div>
        </CardContent>
      </Card>

      {/* PT 목록 */}
      {filteredPtList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            {ptList?.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 신청한 PT가 없습니다
                </h3>
                <p className="text-gray-600 mb-4">새로운 PT를 신청해보세요!</p>
                <Link href="/member/pt/new">
                  <Button variant="primary">PT 신청하기</Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-600">다른 검색어를 입력해보세요.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPtList.map((pt) => {
            const status = getPtStatus(pt);

            return (
              <Link key={pt.id} href={`/member/pt/${pt.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {pt.ptProduct.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>회당 {pt.ptProduct.time}시간</span>
                          <span>•</span>
                          <span>{pt.ptProduct.price.toLocaleString()}원</span>
                        </div>
                      </div>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </div>

                    {/* 트레이너 정보 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">트레이너:</span>
                        <span className="font-medium text-gray-900">
                          {pt.trainer ? pt.trainer.user.username : "배정 대기"}
                        </span>
                      </div>
                    </div>

                    {/* 상태별 추가 정보 */}
                    {pt.isPending && (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-4">
                        <p className="text-sm text-orange-800">
                          💭 트레이너 승인을 기다리고 있습니다
                        </p>
                      </div>
                    )}

                    {pt.isConfirmed && !pt.isCompleted && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-800">
                            🎯 진행률: {pt.completedCount}/
                            {pt.ptProduct.totalCount}회
                          </p>
                          {pt.upcomingSession && (
                            <p className="text-sm text-green-700 font-medium">
                              다음 수업:{" "}
                              {new Date(
                                pt.upcomingSession.date
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {pt.isCompleted && (
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">
                          ✅ 모든 수업이 완료되었습니다
                        </p>
                      </div>
                    )}

                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span>시작일:</span>{" "}
                        <span className="font-medium">
                          {new Date(pt.startDate).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <div>
                        <span>총 횟수:</span>{" "}
                        <span className="font-medium">
                          {pt.ptProduct.totalCount}회
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};

export default MemberPtListPage;
