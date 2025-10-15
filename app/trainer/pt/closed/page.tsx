"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { ErrorMessage } from "@/app/components/ui/Loading";
import { formatDateWithoutWeekday } from "@/app/lib/utils/time.utils";
import type { GetTrainerClosedPtListResult } from "@/app/services/trainer/pt.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ClosedPtPage = () => {
  const now = new Date();
  const initialYMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yMonth, setYMonth] = useState(initialYMonth);

  // SWR로 데이터 페칭
  const { data, error, isLoading } = useSWR<GetTrainerClosedPtListResult>(
    `/api/trainer/pt/closed?yMonth=${yMonth}`,
    fetcher
  );

  // 현재 표시 년월 추출
  const currentYear = parseInt(yMonth.substring(0, 4));
  const currentMonth = parseInt(yMonth.substring(4, 6));

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    const year = parseInt(yMonth.substring(0, 4));
    const month = parseInt(yMonth.substring(4, 6));

    if (month === 1) {
      setYMonth(`${year - 1}12`);
    } else {
      setYMonth(`${year}${String(month - 1).padStart(2, "0")}`);
    }
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    const year = parseInt(yMonth.substring(0, 4));
    const month = parseInt(yMonth.substring(4, 6));

    if (month === 12) {
      setYMonth(`${year + 1}01`);
    } else {
      setYMonth(`${year}${String(month + 1).padStart(2, "0")}`);
    }
  };

  // 상태별 뱃지 스타일 및 텍스트 반환
  const getStateBadge = (state: string) => {
    switch (state) {
      case "FINISHED":
        return <Badge variant="success">정상종료</Badge>;
      case "REFUNDED":
        return <Badge variant="error">환불처리</Badge>;
      case "REJECTED":
        return <Badge variant="warning">상담취소</Badge>;
      default:
        return <Badge variant="default">{state}</Badge>;
    }
  };

  return (
    <div className="lg:flex lg:gap-6">
      <div className="lg:flex-1 lg:max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Link href="/trainer/pt" className="inline-block mb-4">
            <Button variant="outline" size="sm">
              ← PT 관리로 돌아가기
            </Button>
          </Link>
          <PageHeader
            title="종료된 PT 목록"
            subtitle="월별 종료된 PT 내역 조회"
          />
        </div>

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-6 bg-base-100 p-4 rounded-lg shadow">
          <button
            onClick={goToPreviousMonth}
            className="btn btn-circle btn-outline btn-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-center">
            {currentYear}년 {currentMonth}월
          </h2>
          <button
            onClick={goToNextMonth}
            className="btn btn-circle btn-outline btn-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* PT 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <ErrorMessage
            message="종료된 PT 목록을 불러올 수 없습니다."
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            }
          />
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((pt) => (
              <Card key={pt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {pt.memberName}
                        </h3>
                        {getStateBadge(pt.state)}
                      </div>
                      <p className="text-sm text-gray-600">
                        종료일:{" "}
                        {pt.stateUpdatedAt
                          ? formatDateWithoutWeekday(new Date(pt.stateUpdatedAt))
                          : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {currentYear}년 {currentMonth}월에 종료된 PT가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosedPtPage;
