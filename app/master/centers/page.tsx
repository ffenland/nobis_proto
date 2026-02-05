"use client";

import useSWR from "swr";
import Link from "next/link";
import type { IAllCenterDetail } from "@/app/services/master/master-center.service";
import { User, Clock } from "lucide-react";
import Image from "next/image";
import { formatTime } from "@/app/lib/utils/time.utils";

// 요일 한글 변환
const weekDayKorean: Record<string, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

export default function CentersPage() {
  const {
    data: centers,
    error,
    isLoading,
  } = useSWR<IAllCenterDetail>("/api/master/centers");

  // 운영중인 센터와 미운영 센터 분리
  const operatingCenters = centers?.filter((c) => c.inOperation) || [];
  const closedCenters = centers?.filter((c) => !c.inOperation) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>센터 목록을 불러오는데 실패했습니다.</span>
      </div>
    );
  }

  if (!centers || centers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-4a1 1 0 011-1h1a1 1 0 011 1v4m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          등록된 센터가 없습니다
        </h3>
        <p className="text-gray-500 mb-6">첫 번째 센터를 등록해보세요.</p>
        <Link
          href="/master/centers/new"
          className="inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          센터 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">센터 현황</h1>
          <p className="text-gray-600 mt-2">
            운영중 {operatingCenters.length}개 | 미운영 {closedCenters.length}개
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/master/centers/new-manager"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            신규 매니저 등록
          </Link>
          <Link
            href="/master/centers/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            새 센터 등록
          </Link>
        </div>
      </div>

      {/* 운영중인 센터 목록 */}
      <div className="space-y-6 mb-12">
        {operatingCenters.map((center) => (
          <div
            key={center.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            {/* 센터 이름 */}
            <div className="mb-6">
              <Link href={`/master/centers/${center.id}`}>
                <h2 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                  {center.title}
                </h2>
              </Link>
            </div>

            {/* 메인 콘텐츠 영역 - 가로 배치 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* 트레이너 목록 */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  소속 트레이너 ({center.trainers.length}명)
                </h3>
                {center.trainers.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    소속 트레이너가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {center.trainers.map((trainer) => (
                      <div
                        key={trainer.id}
                        className="flex items-center gap-3 bg-white p-3 rounded-md"
                      >
                        {trainer.avatarCloudflareId ? (
                          <Image
                            src={`https://imagedelivery.net/0lhjeB6p33CQhWWHLAXXVA/${trainer.avatarCloudflareId}/avatar`}
                            alt={trainer.realname || "트레이너"}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {trainer.realname || "이름 없음"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 레슨 통계 */}
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  이번 달 레슨 통계
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">완료된 레슨</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {center.monthlyStats.completedLessons}회
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">불참 레슨</span>
                    <span className="text-2xl font-bold text-red-600">
                      {center.monthlyStats.absentLessons}회
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        이번달 레슨 수익
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        {center.monthlyStats.revenue.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 영업시간 */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  영업시간
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {center.openingHours.map((hour) => (
                  <div
                    key={hour.dayOfWeek}
                    className="text-center p-2 bg-gray-50 rounded border"
                  >
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      {weekDayKorean[hour.dayOfWeek]}
                    </div>
                    {hour.isClosed ? (
                      <div className="text-xs text-red-600 font-medium">
                        휴무
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        {formatTime(hour.openTime)} -{" "}
                        {formatTime(hour.closeTime)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 하단 통계 및 액션 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* 추가 통계 */}
              <div className="flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">진행중 PT</span>
                  <span className="badge badge-primary">
                    {center.activePtCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">보유 머신</span>
                  <span className="badge badge-secondary">
                    {center.machineCount}
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Link
                  href={`/master/centers/${center.id}`}
                  className="btn btn-sm btn-outline"
                >
                  상세보기
                </Link>
                <Link
                  href={`/master/centers/${center.id}/edit`}
                  className="btn btn-sm btn-outline"
                >
                  수정
                </Link>
                <Link
                  href={`/master/centers/${center.id}/machines`}
                  className="btn btn-sm btn-primary"
                >
                  머신 관리
                </Link>
                <Link
                  href={`/master/centers/${center.id}/equipments`}
                  className="btn btn-sm btn-secondary"
                >
                  운동기구 관리
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 미운영 센터 목록 */}
      {closedCenters.length > 0 && (
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">미운영 센터</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedCenters.map((center) => (
                <Link
                  key={center.id}
                  href={`/master/centers/${center.id}`}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium text-gray-700">
                      {center.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-red-100 px-2 py-1 rounded">
                    미운영
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
