"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateToYYYYMMDD,
  formatDateToKorean,
} from "@/app/lib/utils/time.utils";
import type {
  GetTodayLessonInfoForMasterResult,
  LessonStatus,
} from "@/app/services/master/master-lesson.service";
import type { IAllCenters } from "@/app/services/master/dashboard.service";

// 시간 슬롯 생성 (9:00 ~ 22:00, 30분 단위)
const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

// 시간을 슬롯 인덱스로 변환
function timeToSlotIndex(timeString: string): number {
  const date = new Date(timeString);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const slotIndex = (hour - 9) * 2 + (minute >= 30 ? 1 : 0);
  return Math.max(0, Math.min(slotIndex, 25)); // 0-25 범위로 제한
}

// 레슨 지속 시간을 슬롯 개수로 변환
function calculateSlotSpan(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  const slots = Math.ceil(durationMinutes / 30);
  return Math.max(1, slots); // 최소 1개 슬롯
}

// 레슨 상태별 색상
const STATUS_COLORS: Record<LessonStatus, string> = {
  예정: "bg-blue-100 border-blue-400 text-blue-900",
  진행중: "bg-orange-100 border-orange-400 text-orange-900",
  참석: "bg-green-100 border-green-400 text-green-900",
  결석: "bg-red-100 border-red-400 text-red-900",
};

const TodayLessonsPage = () => {
  // 선택된 날짜
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // 캘린더 모달 표시 여부
  const [showCalendar, setShowCalendar] = useState(false);

  // 센터 목록 조회
  const { data: allCenters } = useSWR<IAllCenters>(
    "/api/master/dashboard/centers"
  );

  // 오늘의 레슨 데이터 조회 (선택된 날짜 기준)
  const dateParam = formatDateToYYYYMMDD(selectedDate);
  const { data: lessonsData, isLoading } =
    useSWR<GetTodayLessonInfoForMasterResult>(
      `/api/master/lessons?date=${dateParam}`
    );

  // 선택된 센터 ID ("all" = 전체 센터)
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");

  // 선택된 센터의 데이터
  const selectedCenterData = useMemo(() => {
    if (!selectedCenterId || selectedCenterId === "all" || !lessonsData)
      return null;
    return lessonsData[selectedCenterId] || null;
  }, [selectedCenterId, lessonsData]);

  // 전체 센터 모드: 트레이너 목록 합산
  const allTrainers = useMemo(() => {
    if (!lessonsData || selectedCenterId !== "all") return [];

    const trainerList: Array<{
      id: string;
      name: string;
      centerName: string;
      lessons: Array<{
        id: string;
        scheduledAt: string;
        endAt: string;
        memberName: string;
        status: LessonStatus;
      }>;
    }> = [];

    Object.entries(lessonsData).forEach(([centerId, centerData]) => {
      Object.entries(centerData.trainers).forEach(([trainerId, trainerData]) => {
        const uniqueKey = `${centerId}_${trainerId}`;
        trainerList.push({
          id: uniqueKey,
          name: trainerData.trainerName,
          centerName: centerData.centerTitle,
          lessons: trainerData.lessons,
        });
      });
    });

    return trainerList;
  }, [lessonsData, selectedCenterId]);

  // 전체 센터 모드: 취소된 레슨 합산
  const allCanceledLessons = useMemo(() => {
    if (!lessonsData || selectedCenterId !== "all") return [];

    const canceled: Array<{
      id: string;
      scheduledAt: string;
      endAt: string;
      trainerName: string;
      memberName: string;
      centerName: string;
    }> = [];

    Object.values(lessonsData).forEach((centerData) => {
      centerData.canceledLessons.forEach((lesson) => {
        canceled.push({
          ...lesson,
          centerName: centerData.centerTitle,
        });
      });
    });

    // 시간순 정렬
    return canceled.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [lessonsData, selectedCenterId]);

  // 트레이너 목록 (개별 센터 모드)
  const trainers = useMemo(() => {
    if (!selectedCenterData) return [];
    return Object.entries(selectedCenterData.trainers).map(
      ([trainerId, trainerData]) => ({
        id: trainerId,
        name: trainerData.trainerName,
        lessons: trainerData.lessons,
      })
    );
  }, [selectedCenterData]);

  // 날짜 변경 함수
  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // 캘린더에서 날짜 선택
  const handleDaySelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowCalendar(false);
    }
  };

  return (
    <div className="w-full h-full p-4 overflow-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">오늘의 레슨 현황</h1>
        <p className="text-gray-600">센터별 레슨 일정을 한눈에 확인하세요</p>
      </div>

      {/* 날짜 선택 */}
      <div className="mb-6 card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 날짜 네비게이션 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleDateChange(-1)}
                className="btn btn-circle btn-sm btn-outline"
                aria-label="이전 날짜"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCalendar(true)}
                className="text-lg font-semibold hover:text-primary transition-colors"
              >
                {formatDateToKorean(selectedDate)}
              </button>
              <button
                onClick={() => handleDateChange(1)}
                className="btn btn-circle btn-sm btn-outline"
                aria-label="다음 날짜"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 월별 통계 링크 */}
            <a href="/master/stats" className="btn btn-outline btn-sm">
              월별 통계 보러가기
            </a>
          </div>
        </div>
      </div>

      {/* 캘린더 모달 */}
      {showCalendar && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">날짜 선택</h3>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDaySelect}
                locale={undefined}
              />
            </div>
            <div className="modal-action">
              <button
                onClick={() => setShowCalendar(false)}
                className="btn btn-outline"
              >
                닫기
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowCalendar(false)}
          ></div>
        </div>
      )}

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
            </div>
          </div>
        </div>
      )}

      {/* 색상 범례 */}
      <div className="mb-4 card bg-base-100 shadow-sm">
        <div className="card-body p-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span>예정</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-400 rounded"></div>
              <span>진행중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span>참석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded"></div>
              <span>결석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>취소</span>
            </div>
          </div>
        </div>
      </div>

      {/* 타임테이블 그리드 */}
      {isLoading ? (
        /* 로딩 상태 */
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="mt-4 text-gray-600">레슨 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      ) : ((selectedCenterId === "all" && allTrainers.length > 0) ||
          (selectedCenterData && trainers.length > 0)) ? (
        /* 데이터 있음 */
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4">
            <h2 className="card-title mb-4">
              {selectedCenterId === "all"
                ? "전체 센터 - 레슨 타임테이블"
                : `${selectedCenterData?.centerTitle} - 레슨 타임테이블`}
            </h2>
            <div className="overflow-x-auto">
              <table className="table table-bordered border-collapse" style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 p-2 text-center sticky left-0 z-10" style={{ minWidth: "80px", width: "80px" }}>
                      시간
                    </th>
                    {selectedCenterId === "all"
                      ? allTrainers.map((trainer) => (
                          <th
                            key={trainer.id}
                            className="border border-gray-300 bg-gray-100 p-2 text-center"
                            style={{ minWidth: "150px", width: "150px" }}
                          >
                            <div className="text-xs text-gray-500">
                              {trainer.centerName}
                            </div>
                            <div>{trainer.name}</div>
                          </th>
                        ))
                      : trainers.map((trainer) => (
                          <th
                            key={trainer.id}
                            className="border border-gray-300 bg-gray-100 p-2 text-center"
                            style={{ minWidth: "150px", width: "150px" }}
                          >
                            {trainer.name}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((timeSlot, slotIndex) => (
                    <tr key={slotIndex} className="h-12">
                      <td className="border border-gray-300 p-2 text-center text-sm font-medium bg-gray-50 sticky left-0 z-10" style={{ minWidth: "80px", width: "80px" }}>
                        {timeSlot}
                      </td>
                      {(selectedCenterId === "all"
                        ? allTrainers
                        : trainers
                      ).map((trainer) => {
                        // 현재 시간 슬롯에서 시작하는 레슨 찾기
                        const lesson = trainer.lessons.find(
                          (l) => timeToSlotIndex(l.scheduledAt) === slotIndex
                        );

                        if (lesson) {
                          const rowSpan = calculateSlotSpan(
                            lesson.scheduledAt,
                            lesson.endAt
                          );
                          const colorClass = STATUS_COLORS[lesson.status];

                          return (
                            <td
                              key={trainer.id}
                              rowSpan={rowSpan}
                              className={`border border-gray-300 p-2 ${colorClass} relative`}
                            >
                              <div className="text-xs font-semibold">
                                {lesson.memberName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(
                                  lesson.scheduledAt
                                ).toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                ~{" "}
                                {new Date(lesson.endAt).toLocaleTimeString(
                                  "ko-KR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </div>
                              <div className="text-xs font-bold mt-1">
                                {lesson.status}
                              </div>
                            </td>
                          );
                        }

                        // 이미 다른 레슨이 차지하고 있는 셀인지 확인
                        const isOccupied = trainer.lessons.some((l) => {
                          const startSlot = timeToSlotIndex(l.scheduledAt);
                          const span = calculateSlotSpan(
                            l.scheduledAt,
                            l.endAt
                          );
                          return (
                            slotIndex > startSlot &&
                            slotIndex < startSlot + span
                          );
                        });

                        // 빈 셀 (이미 차지된 셀은 렌더링하지 않음)
                        if (!isOccupied) {
                          return (
                            <td
                              key={trainer.id}
                              className="border border-gray-300 bg-white"
                            ></td>
                          );
                        }

                        return null;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 데이터 없음 */
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <p className="text-center text-gray-500 py-8">
              오늘 예정된 레슨이 없습니다
            </p>
          </div>
        </div>
      )}

      {/* 취소된 레슨 목록 */}
      {((selectedCenterId === "all" && allCanceledLessons.length > 0) ||
        (selectedCenterData && selectedCenterData.canceledLessons.length > 0)) && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">취소된 레슨</h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>트레이너</th>
                    <th>회원</th>
                    {selectedCenterId === "all" && <th>센터</th>}
                  </tr>
                </thead>
                <tbody>
                  {(selectedCenterId === "all"
                    ? allCanceledLessons
                    : selectedCenterData?.canceledLessons || []
                  ).map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50">
                      <td className="text-sm">
                        {new Date(lesson.scheduledAt).toLocaleTimeString(
                          "ko-KR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}{" "}
                        ~{" "}
                        {new Date(lesson.endAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="text-sm">{lesson.trainerName}</td>
                      <td className="text-sm">{lesson.memberName}</td>
                      {selectedCenterId === "all" && (
                        <td className="text-sm">
                          {"centerName" in lesson
                            ? (lesson as { centerName: string }).centerName
                            : ""}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayLessonsPage;
