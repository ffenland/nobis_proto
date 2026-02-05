"use client";

import { IAllCenters } from "@/app/services/master/dashboard.service";
import { GetMonthlyStatsResult } from "@/app/services/master/master-stats.service";
import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  formatDateToYYYYMM,
  formatYYYYMMToKorean,
} from "@/app/lib/utils/time.utils";
import { toCurrencyString } from "@/app/lib/utils/format.utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MonthlyStatsPage = () => {
  // 선택된 날짜 (YYYYMM)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return formatDateToYYYYMM(today);
  });

  // 센터 목록 조회
  const { data: allCenters } = useSWR<IAllCenters>(
    "/api/master/dashboard/centers"
  );

  // 월간 통계 데이터 조회
  const { data: statsData, isLoading } = useSWR<GetMonthlyStatsResult>(
    `/api/master/stats?date=${selectedDate}`
  );

  // 선택된 센터 ID ("all" = 전체 센터)
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  // "소속없음" 센터 존재 여부 확인
  const hasNoCenterData = useMemo(() => {
    if (!statsData) return false;
    // trainerRevenue, trainerOffs, ptStats 중 하나라도 "noid" 키가 있으면 true
    return (
      statsData.trainerRevenue["noid"] !== undefined ||
      statsData.trainerOffs["noid"] !== undefined ||
      statsData.ptStats["noid"] !== undefined
    );
  }, [statsData]);

  // 날짜 변경 함수 (월 단위)
  const handleDateChange = (months: number) => {
    const { year, month } = parseYYYYMM(selectedDate);
    const newDate = new Date(year, month - 1 + months, 1);
    setSelectedDate(formatDateToYYYYMM(newDate));
  };

  // YYYYMM 파싱 헬퍼
  const parseYYYYMM = (dateString: string) => {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6));
    return { year, month };
  };

  // 전체 센터 모드: PT 현황 합산
  const aggregatedPtStats = useMemo(() => {
    if (!statsData || selectedCenterId !== "all") return null;

    let totalNew = 0;
    let totalReRegistered = 0;
    let totalEndingSoon = 0;

    Object.values(statsData.ptStats).forEach((centerData) => {
      totalNew += centerData.newPts.count;
      totalReRegistered += centerData.reRegisteredPts.count;
      totalEndingSoon += centerData.endingSoonPts.count;
    });

    return { totalNew, totalReRegistered, totalEndingSoon };
  }, [statsData, selectedCenterId]);

  // 전체 센터 모드: 트레이너별 레슨 수입 합산
  const aggregatedTrainerRevenue = useMemo(() => {
    if (!statsData || selectedCenterId !== "all") return null;

    const trainerMap: Record<
      string,
      {
        trainerName: string;
        totalRevenue: number;
        lessonCount: number;
      }
    > = {};

    Object.values(statsData.trainerRevenue).forEach((centerData) => {
      Object.entries(centerData.trainers).forEach(([trainerId, data]) => {
        if (!trainerMap[trainerId]) {
          trainerMap[trainerId] = {
            trainerName: data.trainerName,
            totalRevenue: 0,
            lessonCount: 0,
          };
        }
        trainerMap[trainerId].totalRevenue += data.totalRevenue;
        trainerMap[trainerId].lessonCount += data.lessonCount;
      });
    });

    return trainerMap;
  }, [statsData, selectedCenterId]);

  // 전체 센터 모드: 트레이너 휴무 합산
  const aggregatedTrainerOffs = useMemo(() => {
    if (!statsData || selectedCenterId !== "all") return null;

    const trainerMap: Record<
      string,
      {
        trainerName: string;
        fullDayOff: number;
        halfDayOff: number;
      }
    > = {};

    Object.values(statsData.trainerOffs).forEach((centerData) => {
      Object.entries(centerData.trainers).forEach(([trainerId, data]) => {
        if (!trainerMap[trainerId]) {
          trainerMap[trainerId] = {
            trainerName: data.trainerName,
            fullDayOff: 0,
            halfDayOff: 0,
          };
        }
        trainerMap[trainerId].fullDayOff += data.fullDayOff;
        trainerMap[trainerId].halfDayOff += data.halfDayOff;
      });
    });

    return trainerMap;
  }, [statsData, selectedCenterId]);

  // 선택된 센터의 데이터
  const selectedCenterData = selectedCenterId !== "all" && statsData;

  return (
    <div className="w-full h-full p-4 overflow-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">월간 통계</h1>
        <p className="text-gray-600">센터별 월간 운영 통계를 확인하세요</p>
      </div>

      {/* 날짜 선택 (연월) */}
      <div className="mb-6 card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 날짜 네비게이션 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleDateChange(-1)}
                className="btn btn-circle btn-sm btn-outline"
                aria-label="이전 월"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-lg font-semibold">
                {formatYYYYMMToKorean(selectedDate)}
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="btn btn-circle btn-sm btn-outline"
                aria-label="다음 월"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 레슨일정 링크 */}
            <a href="/master/lessons" className="btn btn-outline btn-sm">
              오늘의 레슨일정 보러가기
            </a>
          </div>
        </div>
      </div>

      {/* 센터 선택 */}
      {allCenters && allCenters.centers && allCenters.centers.length > 0 && (
        <div className="mb-6 card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              센터 선택
            </h3>
            <div className="flex flex-wrap gap-2">
              {/* 전체 센터 버튼 */}
              <button
                onClick={() => setSelectedCenterId("all")}
                className={`btn ${
                  selectedCenterId === "all" ? "btn-primary" : "btn-outline"
                }`}
              >
                전체 센터
              </button>
              {/* 개별 센터 버튼들 */}
              {allCenters.centers.map((center) => (
                <button
                  key={center.id}
                  onClick={() => setSelectedCenterId(center.id)}
                  className={`btn ${
                    selectedCenterId === center.id
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                >
                  {center.title}
                </button>
              ))}
              {/* 소속없음 센터 버튼 (데이터가 있을 때만 표시) */}
              {hasNoCenterData && (
                <button
                  onClick={() => setSelectedCenterId("noid")}
                  className={`btn ${
                    selectedCenterId === "noid"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                >
                  소속없음
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 통계 섹션 */}
      {isLoading ? (
        /* 로딩 상태 */
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="mt-4 text-gray-600">통계 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      ) : (selectedCenterId === "all" || selectedCenterData) && statsData ? (
        /* 데이터 있음 */
        <div className="space-y-6">
          {/* 1. PT 현황 카드 */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title mb-4">PT 현황</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 신규 PT */}
                <div className="stat bg-blue-50 rounded-lg">
                  <div className="stat-title">신규 등록</div>
                  <div className="stat-value text-blue-600">
                    {selectedCenterId === "all"
                      ? aggregatedPtStats?.totalNew || 0
                      : statsData.ptStats[selectedCenterId]?.newPts.count || 0}
                  </div>
                  <div className="stat-desc">건</div>
                </div>

                {/* 재등록 PT */}
                <div className="stat bg-green-50 rounded-lg">
                  <div className="stat-title">재등록</div>
                  <div className="stat-value text-green-600">
                    {selectedCenterId === "all"
                      ? aggregatedPtStats?.totalReRegistered || 0
                      : statsData.ptStats[selectedCenterId]?.reRegisteredPts
                          .count || 0}
                  </div>
                  <div className="stat-desc">건</div>
                </div>

                {/* 종료 예정 PT */}
                <div className="stat bg-orange-50 rounded-lg">
                  <div className="stat-title">종료 예정</div>
                  <div className="stat-value text-orange-600">
                    {selectedCenterId === "all"
                      ? aggregatedPtStats?.totalEndingSoon || 0
                      : statsData.ptStats[selectedCenterId]?.endingSoonPts
                          .count || 0}
                  </div>
                  <div className="stat-desc">건</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 트레이너별 레슨 수입 */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title mb-4">트레이너별 레슨 수입</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>트레이너</th>
                      <th>레슨 수</th>
                      <th>총 수입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCenterId === "all" && aggregatedTrainerRevenue ? (
                      Object.keys(aggregatedTrainerRevenue).length > 0 ? (
                        Object.entries(aggregatedTrainerRevenue).map(
                          ([trainerId, data]) => (
                            <tr key={trainerId}>
                              <td className="font-semibold">
                                {data.trainerName}
                              </td>
                              <td>{data.lessonCount}회</td>
                              <td className="font-bold text-primary">
                                {toCurrencyString(
                                  Math.round(data.totalRevenue)
                                )}
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-gray-500">
                            데이터가 없습니다
                          </td>
                        </tr>
                      )
                    ) : selectedCenterId !== "all" &&
                      statsData.trainerRevenue[selectedCenterId] &&
                      Object.keys(
                        statsData.trainerRevenue[selectedCenterId].trainers
                      ).length > 0 ? (
                      Object.entries(
                        statsData.trainerRevenue[selectedCenterId].trainers
                      ).map(([trainerId, data]) => (
                        <tr key={trainerId}>
                          <td className="font-semibold">
                            {data.trainerName}
                          </td>
                          <td>{data.lessonCount}회</td>
                          <td className="font-bold text-primary">
                            {toCurrencyString(Math.round(data.totalRevenue))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-500">
                          데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3. 트레이너 휴무 */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title mb-4">트레이너 휴무</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>트레이너</th>
                      <th>연차</th>
                      <th>반차</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCenterId === "all" && aggregatedTrainerOffs ? (
                      Object.keys(aggregatedTrainerOffs).length > 0 ? (
                        Object.entries(aggregatedTrainerOffs).map(
                          ([trainerId, data]) => (
                            <tr key={trainerId}>
                              <td className="font-semibold">
                                {data.trainerName}
                              </td>
                              <td>{data.fullDayOff}일</td>
                              <td>{data.halfDayOff}회</td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-gray-500">
                            데이터가 없습니다
                          </td>
                        </tr>
                      )
                    ) : selectedCenterId !== "all" &&
                      statsData.trainerOffs[selectedCenterId] &&
                      Object.keys(
                        statsData.trainerOffs[selectedCenterId].trainers
                      ).length > 0 ? (
                      Object.entries(
                        statsData.trainerOffs[selectedCenterId].trainers
                      ).map(([trainerId, data]) => (
                        <tr key={trainerId}>
                          <td className="font-semibold">
                            {data.trainerName}
                          </td>
                          <td>{data.fullDayOff}일</td>
                          <td>{data.halfDayOff}회</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-500">
                          데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 데이터 없음 */
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <p className="text-center text-gray-500 py-8">
              통계 데이터가 없습니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyStatsPage;
