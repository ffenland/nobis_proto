"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import {
  IPtDetailForMember,
  IPtRecordItemFromPtDetail,
} from "@/app/lib/services/pt-detail.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const PtDetailPage = () => {
  const params = useParams();
  const ptId = params.id as string;
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // PT 상세 정보 조회
  const {
    data: ptDetail,
    error,
    isLoading,
    mutate,
  } = useSWR<IPtDetailForMember>(
    ptId ? `/api/member/pt/${ptId}` : null,
    fetcher
  );

  // 시간 포맷 함수
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return { text: "오늘", isToday: true, isPast: false };
    } else if (date < today) {
      return {
        text: date.toLocaleDateString("ko-KR"),
        isToday: false,
        isPast: true,
      };
    } else {
      return {
        text: date.toLocaleDateString("ko-KR"),
        isToday: false,
        isPast: false,
      };
    }
  };

  // 출석 상태별 텍스트
  const getAttendanceText = (attended: string) => {
    switch (attended) {
      case "ATTENDED":
        return { text: "완료", variant: "success" as const };
      case "ABSENT":
        return { text: "결석", variant: "error" as const };
      case "RESERVED":
        return { text: "예정", variant: "default" as const };
      default:
        return { text: "미정", variant: "default" as const };
    }
  };

  // 운동 기록 포맷팅 함수
  const formatExerciseRecord = (item: IPtRecordItemFromPtDetail) => {
    switch (item.type) {
      case "MACHINE":
        return item.machineSetRecords.map((record) => ({
          name: item.title || "머신 운동",
          details: `${record.set}세트 × ${record.reps}회`,
          settings: record.settingValues
            .map(
              (sv) =>
                `${sv.machineSetting.title}: ${sv.value}${sv.machineSetting.unit}`
            )
            .join(", "),
        }));

      case "FREE":
        return item.freeSetRecords.map((record) => ({
          name: item.title || "프리웨이트",
          details: `${record.set}세트 × ${record.reps}회`,
          settings: record.weights
            .map((w) => `${w.title}: ${w.weight}${w.unit}`)
            .join(", "),
        }));

      case "STRETCHING":
        return item.stretchingExerciseRecords.map((record) => ({
          name: record.stretchingExercise.title,
          details: record.description || "",
          settings: record.stretchingExercise.description,
        }));

      default:
        return [
          {
            name: item.title || "운동",
            details: item.description || "",
            settings: "",
          },
        ];
    }
  };

  // PT 상태 결정
  const getPtStatus = (pt: IPtDetailForMember["pt"]) => {
    if (!pt.trainerConfirmed) {
      return { text: "승인대기", variant: "warning" as const };
    } else if (pt.isActive) {
      return { text: "진행중", variant: "success" as const };
    } else {
      return { text: "완료", variant: "default" as const };
    }
  };

  // 만료일 계산
  const getExpiryDate = (startDate: string, totalCount: number) => {
    const start = new Date(startDate);
    const months = totalCount < 11 ? 2 : totalCount < 21 ? 3 : 4;
    const expiry = new Date(start);
    expiry.setMonth(expiry.getMonth() + months);
    return expiry;
  };

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="PT 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (error || !ptDetail) {
    return (
      <PageLayout maxWidth="lg">
        <ErrorMessage
          message="PT 정보를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const { pt, userId } = ptDetail;
  const status = getPtStatus(pt);
  const expiryDate = getExpiryDate(pt.startDate, pt.ptProduct.totalCount);
  const remainingSessions = pt.ptProduct.totalCount - pt.ptRecord.length;

  return (
    <PageLayout maxWidth="lg">
      {/* 헤더 */}
      <PageHeader
        title="PT 상세"
        subtitle={pt.ptProduct.title}
        action={
          <Link href="/member/pt">
            <Button variant="outline">목록으로</Button>
          </Link>
        }
      />

      {/* PT 기본 정보 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {pt.ptProduct.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>회당 {pt.ptProduct.time}시간</span>
                <span>•</span>
                <span>총 {pt.ptProduct.totalCount}회</span>
                <span>•</span>
                <span>{pt.ptProduct.price.toLocaleString()}원</span>
              </div>
            </div>
            <Badge variant={status.variant}>{status.text}</Badge>
          </div>

          <p className="text-gray-600 mb-4">{pt.ptProduct.description}</p>

          {/* 트레이너 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-2">담당 트레이너</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {pt.trainer?.user.username[0]}
                  </span>
                </div>
                <span className="font-medium text-gray-900">
                  {pt.trainer ? pt.trainer.user.username : "배정 대기중"}
                </span>
              </div>
              {pt.trainer && !pt.isActive && (
                <Button variant="outline" size="sm">
                  채팅하기
                </Button>
              )}
            </div>
          </div>

          {/* 진행 상황 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {pt.ptRecord.length}
              </div>
              <div className="text-sm text-gray-600">완료된 수업</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {remainingSessions}
              </div>
              <div className="text-sm text-gray-600">남은 수업</div>
            </div>
          </div>

          {/* 만료 경고 */}
          {remainingSessions > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-amber-800">
                  ⚠️ 수업 마감일
                </span>
                <span className="text-sm text-amber-700">
                  {expiryDate.toLocaleDateString("ko-KR")}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                마감일까지 남은 수업을 모두 이용해주세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 정보 (정기 수업인 경우) */}
      {pt.isRegular && pt.weekTimes.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">정기 스케줄</h3>
            <div className="flex flex-wrap gap-2">
              {pt.weekTimes.map((weekTime, index) => {
                const dayMap: Record<string, string> = {
                  MON: "월",
                  TUE: "화",
                  WED: "수",
                  THU: "목",
                  FRI: "금",
                  SAT: "토",
                  SUN: "일",
                };

                return (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
                  >
                    {dayMap[weekTime.weekDay]} {formatTime(weekTime.startTime)}-
                    {formatTime(weekTime.endTime)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 수업 기록 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">수업 기록</h3>

          {pt.ptRecord.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500">아직 수업 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pt.ptRecord
                .sort(
                  (a, b) =>
                    new Date(a.ptSchedule.date).getTime() -
                    new Date(b.ptSchedule.date).getTime()
                )
                .map((record) => {
                  const dateInfo = formatDate(record.ptSchedule.date);
                  const attendance = getAttendanceText(record.attended);
                  const isExpanded = expandedRecord === record.id;

                  return (
                    <div
                      key={record.id}
                      className={`border rounded-lg transition-all ${
                        dateInfo.isPast
                          ? "bg-gray-50 border-gray-200"
                          : dateInfo.isToday
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setExpandedRecord(isExpanded ? null : record.id)
                        }
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {dateInfo.text}
                              </span>
                              <span className="text-sm text-gray-600">
                                {formatTime(record.ptSchedule.startTime)} -{" "}
                                {formatTime(record.ptSchedule.endTime)}
                              </span>
                            </div>
                            {dateInfo.isToday && (
                              <Badge variant="default">Today</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={attendance.variant}>
                              {attendance.text}
                            </Badge>
                            <span className="text-gray-400">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          {record.attended === "ATTENDED" &&
                          record.items.length > 0 ? (
                            <div className="pt-3">
                              <h4 className="font-medium text-gray-900 mb-3">
                                운동 기록
                              </h4>
                              <div className="space-y-2">
                                {record.items.map((item) => {
                                  const exercises = formatExerciseRecord(item);
                                  return exercises.map(
                                    (exercise, exerciseIndex) => (
                                      <div
                                        key={`${item.id}-${exerciseIndex}`}
                                        className="p-2 bg-gray-50 rounded"
                                      >
                                        <div className="flex justify-between items-start">
                                          <span className="text-sm font-medium">
                                            {exercise.name}
                                          </span>
                                          <span className="text-sm text-gray-600">
                                            {exercise.details}
                                          </span>
                                        </div>
                                        {exercise.settings && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {exercise.settings}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-3 text-center text-gray-500">
                              <p className="text-sm">운동 기록이 없습니다</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 하단 여백 (탭바 공간 확보) */}
      <div className="h-20"></div>
    </PageLayout>
  );
};

export default PtDetailPage;
