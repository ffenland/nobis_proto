// app/trainer/pt/page.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import type { GetTrainerPtListResult } from "@/app/services/trainer/pt.service";
import {
  formatDateWithoutWeekday,
  formatTime,
  getTimeFromDateTime,
} from "@/app/lib/utils/time.utils";

const TrainerPtPage = () => {
  // SWR로 데이터 페칭 - 타입 명시
  const { data, error, isLoading } =
    useSWR<GetTrainerPtListResult>("/api/trainer/pt");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">데이터를 불러올 수 없습니다.</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // 상태별 필터링
  const activePts = data.activePts.filter((pt) => pt.status === "active");
  const closingSoonPts = data.activePts.filter(
    (pt) => pt.status === "closing_soon"
  );
  const completedPts = data.activePts.filter((pt) => pt.status === "completed");

  return (
    <>
      {/* 반응형 컨테이너 - 태블릿 이상에서 사이드바 영역 표시 */}
      <div className="lg:flex lg:gap-6 px-3">
        {/* 메인 콘텐츠 영역 */}
        <div className="lg:flex-1 lg:max-w-4xl">
          {/* 헤더 */}
          <div className="mb-6">
            <PageHeader title="PT 관리" subtitle="진행 중인 PT 프로그램 관리" />
          </div>

          {/* 통계 요약 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4  text-center">
                <div className=" flex items-center justify-center gap-2 mb-1">
                  <p className=" text-sm text-green-600">진행중 PT</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {data.stats.active}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-amber-600 mb-1">종료임박</p>
                <p className="text-2xl font-bold text-amber-900">
                  {data.stats.closingSoon}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.completed}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 승인 대기 PT 버튼 */}
          <Link href="/trainer/pt/pending" className="block mb-4">
            <Button variant="outline" className="w-full">
              승인 대기 중인 PT 신청 확인하기
            </Button>
          </Link>

          {/* 새로운 PT 접수하기 버튼 */}
          <Link href="/trainer/pt/new" className="block mb-6">
            <Button variant="default" className="w-full">
              새로운 PT 접수하기
            </Button>
          </Link>

          {/* PT 목록 - 태블릿 이상에서 2열 그리드 */}
          <div className="space-y-6">
            {/* 진행 중인 PT */}
            {activePts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  진행 중
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activePts.map((pt) => (
                    <PtCard key={pt.id} pt={pt} />
                  ))}
                </div>
              </div>
            )}

            {/* 종료 임박 PT */}
            {closingSoonPts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-3">
                  종료 임박
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {closingSoonPts.map((pt) => (
                    <PtCard key={pt.id} pt={pt} />
                  ))}
                </div>
              </div>
            )}

            {/* 완료된 PT */}
            {completedPts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">
                  완료됨
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completedPts.map((pt) => (
                    <PtCard key={pt.id} pt={pt} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 영역 - 태블릿 이상에서만 표시 */}
        <div className="hidden lg:block lg:w-80">
          <div className="sticky top-4 space-y-4">
            {/* 빠른 통계 카드 */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">
                  이번 달 실적
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-indigo-700">총 수업</span>
                    <span className="font-bold text-indigo-900">82회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-indigo-700">신규 등록</span>
                    <span className="font-bold text-indigo-900">3명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-indigo-700">재등록률</span>
                    <span className="font-bold text-indigo-900">75%</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                  상세 보기
                </Button>
              </CardContent>
            </Card>

            {/* 빠른 액션 */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-green-900 mb-4">
                  빠른 작업
                </h3>
                <div className="space-y-2">
                  <Link href="/trainer/pt/new-record" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <span className="mr-2">📝</span> 수업 기록 작성
                    </Button>
                  </Link>
                  <Link href="/trainer/schedule" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <span className="mr-2">📅</span> 일정 관리
                    </Button>
                  </Link>
                  <Link href="/trainer/chat" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <span className="mr-2">💬</span> 회원 메시지
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 공지사항 */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-amber-900 mb-4">
                  공지사항
                </h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">시스템 점검</p>
                    <p className="text-amber-700 text-xs">8/20 02:00-04:00</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">교육 일정</p>
                    <p className="text-amber-700 text-xs">
                      8/25 트레이너 워크샵
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

// PT 카드 컴포넌트
type PtItem = GetTrainerPtListResult["activePts"][0];

interface PtCardProps {
  pt: PtItem;
}

const PtCard = ({ pt }: PtCardProps) => {
  // FINISHED PT는 progress와 세부 정보가 없음
  const progressPercentage = "progress" in pt ? pt.progress : 100;

  return (
    <Link href={`/trainer/pt/${pt.id}`}>
      <Card
        className={`
        hover:shadow-md transition-all cursor-pointer
        ${pt.status === "closing_soon" ? "border-amber-200 bg-amber-50/50" : ""}
        ${
          pt.status === "completed"
            ? "border-gray-200 bg-gray-50/50 opacity-75"
            : ""
        }
      `}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700">
                  {pt.memberName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{pt.memberName}</h3>
                {"productName" in pt && (
                  <p className="text-sm text-gray-600">{pt.productName}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {pt.status === "active" && (
                <Badge variant="success">진행중</Badge>
              )}
              {pt.status === "closing_soon" && (
                <Badge variant="warning">종료임박</Badge>
              )}
              {pt.status === "completed" && (
                <Badge variant="default">완료</Badge>
              )}
            </div>
          </div>

          {/* 진행률 바 - CONFIRMED PT만 표시 */}
          {"completedSessions" in pt && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>
                  {pt.completedSessions}/{pt.totalSessions}회
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    pt.status === "closing_soon"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* 일정 정보 */}
          <div className="flex justify-between text-sm">
            <div className="text-gray-600">
              <span>
                마지막 수업:{" "}
                {pt.lastCompletedLesson
                  ? formatDateWithoutWeekday(pt.lastCompletedLesson.scheduledAt)
                  : "-"}
              </span>
            </div>
            {"nextLesson" in pt && pt.nextLesson && (
              <div className="text-blue-600 font-medium">
                다음: {formatDateWithoutWeekday(pt.nextLesson.scheduledAt)}{" "}
                {formatTime(getTimeFromDateTime(pt.nextLesson.scheduledAt))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TrainerPtPage;
