"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import type {
  IAllCenters,
  GetPendingTrainerOffCountResult,
  GetUncheckedCanceledLessonsCountResult,
  GetUncheckedPtPausesCountResult,
  GetUnpaidPtPaymentsResult,
  IMasterDashboardPts,
} from "@/app/services/master/dashboard.service";

// 데이터 페처
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MasterDashboardPage() {
  // API 데이터 가져오기
  const { data: allCenters, error: centersError } = useSWR<IAllCenters>(
    "/api/master/dashboard/centers",
    fetcher
  );

  const { data: scheduleData, error: scheduleError } =
    useSWR<GetPendingTrainerOffCountResult>(
      "/api/master/dashboard/schedule",
      fetcher
    );

  const { data: canceledLessonsData, error: canceledError } =
    useSWR<GetUncheckedCanceledLessonsCountResult>(
      "/api/master/dashboard/lesson-cancel",
      fetcher
    );

  const { data: ptPausesData, error: ptPausesError } =
    useSWR<GetUncheckedPtPausesCountResult>(
      "/api/master/dashboard/pt-pause",
      fetcher
    );

  const { data: unpaidData, error: unpaidError } =
    useSWR<GetUnpaidPtPaymentsResult>("/api/master/dashboard/unpaid", fetcher);

  const { data: ptData, error: ptError } = useSWR<IMasterDashboardPts>(
    "/api/master/dashboard/pt",
    fetcher
  );

  // 전역 센터 선택 state (기본값: 첫 번째 센터)
  const [globalSelectedCenterId, setGlobalSelectedCenterId] = useState<
    string | null
  >(null);

  // allCenters 로드 후 기본값 설정 (첫 번째 센터)
  useEffect(() => {
    if (allCenters?.centers && allCenters.centers.length > 0) {
      setGlobalSelectedCenterId(allCenters.centers[0].id);
    }
  }, [allCenters]);
  // 로딩 상태 체크 함수
  const isLoadingSchedule = !scheduleData && !scheduleError;
  const isLoadingCanceled = !canceledLessonsData && !canceledError;
  const isLoadingPtPauses = !ptPausesData && !ptPausesError;
  const isLoadingUnpaid = !unpaidData && !unpaidError;
  const isLoadingPt = !ptData && !ptError;

  return (
    <div className="w-full h-full overflow-auto p-4">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">마스터 대시보드</h1>
        <p className="text-gray-600">전체 센터 운영 현황을 한눈에 확인하세요</p>
      </div>

      {/* 센터 선택 UI - 센터가 2개 이상인 경우에만 표시 */}
      {allCenters && allCenters.centers.length > 1 && (
        <div className="mb-6 card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              센터 선택
            </h3>
            <div className="flex flex-wrap gap-2">
              {allCenters.centers.map((center) => (
                <button
                  key={center.id}
                  onClick={() => setGlobalSelectedCenterId(center.id)}
                  className={`btn ${
                    globalSelectedCenterId === center.id
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                >
                  {center.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 이번달 PT 정보 카드 - 전체 너비 */}
      <Link href="/master/pt" className="block mb-4">
        <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-blue-100 transition-colors">
          <div className="card-body p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-indigo-800 mb-3">
              이번달 PT 정보
            </h3>
            {isLoadingPt ? (
              <div className="flex justify-center py-4">
                <div className="loading loading-spinner loading-md text-indigo-600"></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">신규등록</span>
                  <span className="text-xl md:text-2xl font-bold text-blue-600">
                    {globalSelectedCenterId && ptData?.[globalSelectedCenterId]
                      ? ptData[globalSelectedCenterId].newCount
                      : 0}
                  </span>
                  <span className="text-sm text-gray-600">건</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">재등록</span>
                  <span className="text-xl md:text-2xl font-bold text-green-600">
                    {globalSelectedCenterId && ptData?.[globalSelectedCenterId]
                      ? ptData[globalSelectedCenterId].reRegisteredCount
                      : 0}
                  </span>
                  <span className="text-sm text-gray-600">건</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">종료예정</span>
                  <span className="text-xl md:text-2xl font-bold text-amber-600">
                    {globalSelectedCenterId && ptData?.[globalSelectedCenterId]
                      ? ptData[globalSelectedCenterId].endingSoonCount
                      : 0}
                  </span>
                  <span className="text-sm text-gray-600">건</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* 대시보드 현황 카드 - 모바일 2열, 데스크탑 3열 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-8">
        {/* 미결제 PT 카드 */}
        <Link href="/master/audit/payment">
          <div className="card bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors">
            <div className="card-body p-3 md:p-6 flex flex-col justify-between">
              <h3 className="card-title text-xs md:text-base text-rose-800">
                미결제 PT
              </h3>
              {isLoadingUnpaid ? (
                <div className="loading loading-spinner loading-sm text-rose-600"></div>
              ) : (
                <div className="text-lg md:text-3xl font-bold text-rose-600">
                  {globalSelectedCenterId &&
                  unpaidData?.[globalSelectedCenterId]
                    ? unpaidData[globalSelectedCenterId].count
                    : 0}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* 트레이너 휴무 신청 현황 카드 */}
        <Link href="/master/trainers/off">
          <div className="card bg-purple-50 border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="card-body p-3 md:p-6 flex flex-col justify-between">
              <h3 className="card-title text-xs md:text-base text-purple-800">
                트레이너 휴무 신청 현황
              </h3>
              {isLoadingSchedule ? (
                <div className="loading loading-spinner loading-sm text-purple-600"></div>
              ) : (
                <div className="text-lg md:text-3xl font-bold text-purple-600">
                  {globalSelectedCenterId && scheduleData?.[globalSelectedCenterId]
                    ? scheduleData[globalSelectedCenterId].count
                    : 0}
                  건
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* 취소된 레슨 확인 현황 카드 */}
        <Link href="/master/audit/lesson-cancel">
          <div className="card bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors">
            <div className="card-body p-3 md:p-6 flex flex-col justify-between">
              <h3 className="card-title text-xs md:text-base text-orange-800">
                취소된 레슨 확인
              </h3>
              {isLoadingCanceled ? (
                <div className="loading loading-spinner loading-sm text-orange-600"></div>
              ) : (
                <div className="text-lg md:text-3xl font-bold text-orange-600">
                  {globalSelectedCenterId &&
                  canceledLessonsData?.[globalSelectedCenterId]
                    ? canceledLessonsData[globalSelectedCenterId].count
                    : 0}
                  건
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* PT 일시정지 확인 현황 카드 */}
        <Link href="/master/audit/pt-pause">
          <div className="card bg-teal-50 border border-teal-200 cursor-pointer hover:bg-teal-100 transition-colors">
            <div className="card-body p-3 md:p-6 flex flex-col justify-between">
              <h3 className="card-title text-xs md:text-base text-teal-800">
                PT 일시정지 확인
              </h3>
              {isLoadingPtPauses ? (
                <div className="loading loading-spinner loading-sm text-teal-600"></div>
              ) : (
                <div className="text-lg md:text-3xl font-bold text-teal-600">
                  {globalSelectedCenterId && ptPausesData?.[globalSelectedCenterId]
                    ? ptPausesData[globalSelectedCenterId].count
                    : 0}
                  건
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
