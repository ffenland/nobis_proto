"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { formatTime } from "@/app/lib/utils/time.utils";
import type {
  GetTodayLessonsResult,
  GetWeeklyLessonsCountResult,
  GetPtStatsResult,
  GetManagerCentersResult,
} from "@/app/services/mananger/dashboard.service";

// 데이터 페처
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ManagerDashboardPage() {
  // API 데이터 가져오기
  const { data: todayLessons, error: todayError } =
    useSWR<GetTodayLessonsResult>("/api/manager/dashboard/lesson", fetcher);

  const { data: weeklyLessons, error: weeklyError } =
    useSWR<GetWeeklyLessonsCountResult>(
      "/api/manager/dashboard/weekly-lesson",
      fetcher
    );

  const { data: ptStats, error: ptError } = useSWR<GetPtStatsResult>(
    "/api/manager/dashboard/pt",
    fetcher
  );

  const { data: managerCenters, error: centersError } =
    useSWR<GetManagerCentersResult>("/api/manager/dashboard/centers", fetcher);

  // 센터별 통계 계산
  const [centerStats, setCenterStats] = useState<{
    [key: string]: {
      title: string;
      todayLessons: number;
      weeklyLessons: number;
    };
  }>({});

  useEffect(() => {
    if (todayLessons && weeklyLessons && managerCenters) {
      const stats: typeof centerStats = {};

      // 모든 센터를 0으로 초기화
      managerCenters.centers.forEach((center) => {
        stats[center.id] = {
          title: center.title,
          todayLessons: 0,
          weeklyLessons: 0,
        };
      });

      // 오늘 레슨 집계
      todayLessons.lessons.forEach((lesson) => {
        if (stats[lesson.fitnessCenterId]) {
          stats[lesson.fitnessCenterId].todayLessons++;
        }
      });

      // 주간 레슨 집계
      weeklyLessons.weeklyStats.forEach((day) => {
        day.lessons.forEach((lesson) => {
          if (stats[lesson.fitnessCenterId]) {
            stats[lesson.fitnessCenterId].weeklyLessons++;
          }
        });
      });

      setCenterStats(stats);
    }
  }, [todayLessons, weeklyLessons, managerCenters]);

  // 로딩 상태
  if (!todayLessons || !weeklyLessons || !ptStats || !managerCenters) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (todayError || weeklyError || ptError || centersError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto ">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">매니저 대시보드</h1>
        <p className="text-gray-600">전체 센터 운영 현황을 한눈에 확인하세요</p>
      </div>

      {/* PT 현황 카드 - 모바일에서도 3개 가로 배치 */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
        <div className="card bg-blue-50 border border-blue-200">
          <div className="card-body p-3 md:p-6">
            <h3 className="card-title text-xs md:text-base text-blue-800">
              신규 등록 PT
            </h3>
            <div className="text-lg md:text-3xl font-bold text-blue-600">
              {ptStats.newPts.count}
            </div>
            <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2">
              이번 달 신규 회원
            </p>
            {/* 모바일 이상에서 센터별 분류 표시 */}
            <div className="hidden md:block mt-2 space-y-1">
              {Object.entries(ptStats.newPts.centerStats).map(([centerId, stats]) => (
                <div key={centerId} className="text-xs text-blue-500">
                  {stats.title}: {stats.count}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border border-green-200">
          <div className="card-body p-3 md:p-6">
            <h3 className="card-title text-xs md:text-base text-green-800">
              재등록 PT
            </h3>
            <div className="text-lg md:text-3xl font-bold text-green-600">
              {ptStats.reRegisteredPts.count}
            </div>
            <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2">
              이번 달 재등록
            </p>
            {/* 모바일 이상에서 센터별 분류 표시 */}
            <div className="hidden md:block mt-2 space-y-1">
              {Object.entries(ptStats.reRegisteredPts.centerStats).map(([centerId, stats]) => (
                <div key={centerId} className="text-xs text-green-500">
                  {stats.title}: {stats.count}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-amber-50 border border-amber-200">
          <div className="card-body p-3 md:p-6">
            <h3 className="card-title text-xs md:text-base text-amber-800">
              종료 예정 PT
            </h3>
            <div className="text-lg md:text-3xl font-bold text-amber-600">
              {ptStats.endingSoonPts.count}
            </div>
            <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2">
              곧 종료 또는 3회 이하
            </p>
            {/* 모바일 이상에서 센터별 분류 표시 */}
            <div className="hidden md:block mt-2 space-y-1">
              {Object.entries(ptStats.endingSoonPts.centerStats).map(([centerId, stats]) => (
                <div key={centerId} className="text-xs text-amber-500">
                  {stats.title}: {stats.count}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 센터별 통계 */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">센터별 운영 현황</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>센터명</th>
                  <th className="text-center">오늘 레슨</th>
                  <th className="text-center">주간 레슨</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(centerStats).map(([centerId, stats]) => (
                  <tr key={centerId}>
                    <td className="font-medium">{stats.title}</td>
                    <td className="text-center">
                      <span className="badge badge-primary">
                        {stats.todayLessons}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-secondary">
                        {stats.weeklyLessons}
                      </span>
                    </td>
                  </tr>
                ))}
                {Object.keys(centerStats).length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500">
                      센터 데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 오늘의 레슨 - 반응형 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 오늘 레슨 목록 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              오늘의 레슨
              <span className="badge badge-info">
                {todayLessons.lessons.length}
              </span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todayLessons.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        {formatTime(
                          new Date(lesson.scheduledAt).getHours() * 100 +
                            new Date(lesson.scheduledAt).getMinutes()
                        )}{" "}
                        -{" "}
                        {formatTime(
                          new Date(lesson.endAt).getHours() * 100 +
                            new Date(lesson.endAt).getMinutes()
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        트레이너: {lesson.trainerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {lesson.fitnessCenterTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      {lesson.recordsCount > 0 ? (
                        <span className="badge badge-success">완료</span>
                      ) : new Date(lesson.scheduledAt) < new Date() ? (
                        <span className="badge badge-warning">미완료</span>
                      ) : (
                        <span className="badge badge-ghost">예정</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {todayLessons.lessons.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  오늘 예정된 레슨이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 주간 일정 요약 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">주간 일정 요약</h2>
            <div className="space-y-2">
              {weeklyLessons.weeklyStats.map((day, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    day.isToday
                      ? "bg-blue-100 border border-blue-300"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        day.isToday ? "text-blue-700" : ""
                      }`}
                    >
                      {day.month}/{day.date} ({day.day})
                    </span>
                    {day.isToday && (
                      <span className="badge badge-primary badge-sm">오늘</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{day.lessonCount}</span>
                    <span className="text-sm text-gray-600">레슨</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PT 상세 정보 - 탭 형식 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">PT 상세 현황</h2>

          <div role="tablist" className="tabs tabs-boxed mb-4">
            <input
              type="radio"
              name="pt_tabs"
              role="tab"
              className="tab"
              aria-label="신규 등록"
              defaultChecked
            />
            <div role="tabpanel" className="tab-content pt-4">
              <div className="space-y-2">
                {ptStats.newPts.pts.slice(0, 5).map((pt) => (
                  <div
                    key={pt.id}
                    className="flex justify-between items-center p-2 bg-blue-50 rounded"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {pt.memberName}
                      </span>
                      <span className="text-xs text-gray-600">
                        트레이너: {pt.trainerName}
                      </span>
                    </div>
                    {pt.nearestLessonAt && (
                      <span className="text-xs text-gray-600">
                        다음 레슨:{" "}
                        {new Date(pt.nearestLessonAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
                {ptStats.newPts.pts.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    신규 등록 PT가 없습니다
                  </p>
                )}
              </div>
            </div>

            <input
              type="radio"
              name="pt_tabs"
              role="tab"
              className="tab"
              aria-label="재등록"
            />
            <div role="tabpanel" className="tab-content pt-4">
              <div className="space-y-2">
                {ptStats.reRegisteredPts.pts.slice(0, 5).map((pt) => (
                  <div
                    key={pt.id}
                    className="flex justify-between items-center p-2 bg-green-50 rounded"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {pt.memberName}
                      </span>
                      <span className="text-xs text-gray-600">
                        트레이너: {pt.trainerName}
                      </span>
                    </div>
                    {pt.nearestLessonAt && (
                      <span className="text-xs text-gray-600">
                        다음 레슨:{" "}
                        {new Date(pt.nearestLessonAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
                {ptStats.reRegisteredPts.pts.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    재등록 PT가 없습니다
                  </p>
                )}
              </div>
            </div>

            <input
              type="radio"
              name="pt_tabs"
              role="tab"
              className="tab"
              aria-label="종료 예정"
            />
            <div role="tabpanel" className="tab-content pt-4">
              <div className="space-y-2">
                {ptStats.endingSoonPts.pts.slice(0, 5).map((pt) => (
                  <div
                    key={pt.id}
                    className="flex justify-between items-center p-2 bg-amber-50 rounded"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {pt.memberName}
                      </span>
                      <span className="text-xs text-gray-600">
                        트레이너: {pt.trainerName}
                      </span>
                    </div>
                    {pt.nearestLessonAt && (
                      <span className="text-xs text-gray-600">
                        다음 레슨:{" "}
                        {new Date(pt.nearestLessonAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
                {ptStats.endingSoonPts.pts.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    종료 예정 PT가 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
