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

  // PT 상태 결정 (수정된 버전)
  const getPtStatus = (pt: IPtDetailForMember["pt"]) => {
    // 트레이너 승인과 state가 모두 CONFIRMED일 때만 승인됨으로 처리
    if (pt.trainerConfirmed && pt.state === "CONFIRMED") {
      // 완료된 세션 수 확인
      const completedSessions = pt.ptRecord.filter(
        (record) => record.attended === "ATTENDED"
      ).length;

      if (completedSessions >= pt.ptProduct.totalCount) {
        return { text: "완료", variant: "default" as const };
      }
      return { text: "진행중", variant: "success" as const };
    } else if (pt.state === "REJECTED") {
      return { text: "거절됨", variant: "error" as const };
    } else if (pt.state === "PENDING") {
      return { text: "승인대기", variant: "warning" as const };
    } else {
      return { text: "알 수 없음", variant: "default" as const };
    }
  };

  // 만료일 계산
  const getExpiryDate = (startDate: string, totalCount: number) => {
    const start = new Date(startDate);
    const months = totalCount < 11 ? 1 : totalCount < 21 ? 3 : 4;
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
  const completedSessions = pt.ptRecord.filter(
    (record) => record.attended === "ATTENDED"
  ).length;

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

          {/* 진행 상태 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">진행 상태</span>
              <span className="text-sm font-medium text-gray-900">
                {completedSessions}/{pt.ptProduct.totalCount}회 완료
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (completedSessions / pt.ptProduct.totalCount) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

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
                  {pt.trainer?.user.username || "트레이너 배정 대기"}
                </span>
              </div>
              {pt.trainer && (
                <Link href={`/member/chat/${pt.trainer.user.id}`}>
                  <Button variant="outline" size="sm">
                    메시지
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 기간 정보 */}
          {status.text === "진행중" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">시작일</span>
                <div className="font-medium text-gray-900">
                  {new Date(pt.startDate).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <div>
                <span className="text-gray-600">만료 예정일</span>
                <div className="font-medium text-gray-900">
                  {expiryDate.toLocaleDateString("ko-KR")}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수업 기록 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">수업 기록</h3>
            <span className="text-sm text-gray-600">
              총 {pt.ptRecord.length}개 세션
            </span>
          </div>

          {pt.ptRecord.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 수업 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {pt.ptRecord.map((record) => {
                const dateInfo = formatDate(record.ptSchedule.date);
                const attendanceInfo = getAttendanceText(record.attended);
                const isExpanded = expandedRecord === record.id;

                return (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedRecord(isExpanded ? null : record.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-medium ${
                                dateInfo.isToday
                                  ? "text-blue-600"
                                  : dateInfo.isPast
                                  ? "text-gray-900"
                                  : "text-gray-600"
                              }`}
                            >
                              {dateInfo.text}
                            </span>
                            <span className="text-gray-600">
                              {formatTime(record.ptSchedule.startTime)} -{" "}
                              {formatTime(record.ptSchedule.endTime)}
                            </span>
                            <Badge variant={attendanceInfo.variant}>
                              {attendanceInfo.text}
                            </Badge>
                          </div>
                          {record.memo && (
                            <p className="text-sm text-gray-600 mt-1">
                              {record.memo}
                            </p>
                          )}
                        </div>
                        <div className="text-gray-400">
                          {isExpanded ? "△" : "▽"}
                        </div>
                      </div>
                    </div>

                    {/* 운동 기록 상세 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        {record.items.length === 0 ? (
                          <p className="text-gray-500 text-sm">
                            운동 기록이 없습니다.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {record.items.map((item, index) => {
                              const exercises = formatExerciseRecord(item);
                              return (
                                <div
                                  key={index}
                                  className="bg-white rounded p-3"
                                >
                                  <h4 className="font-medium text-gray-900 mb-2">
                                    {item.title || "운동"}
                                  </h4>
                                  {exercises.map((exercise, exerciseIndex) => (
                                    <div
                                      key={exerciseIndex}
                                      className="text-sm text-gray-600 mb-1"
                                    >
                                      <div className="flex justify-between">
                                        <span>{exercise.name}</span>
                                        <span>{exercise.details}</span>
                                      </div>
                                      {exercise.settings && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {exercise.settings}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
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
    </PageLayout>
  );
};

export default PtDetailPage;
