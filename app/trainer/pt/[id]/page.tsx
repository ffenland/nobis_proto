// app/trainer/pt/[id]/page.tsx
import Link from "next/link";
import { PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import Image from "next/image";
import {
  getPtDetailAction,
  type TPtDetail,
  type TPtRecord,
  type TPtRecordItem,
} from "./actions";
import {
  XCircle,
  ChevronRight,
} from "lucide-react";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 출석 상태 계산 함수
const calculateAttendanceStatus = (
  ptSchedule: TPtRecord["ptSchedule"],
  items: TPtRecordItem[]
): "참석" | "불참" | "예정" => {
  const now = new Date();
  const classDate = new Date(ptSchedule.date);
  const classStartTime = ptSchedule.startTime;

  const startHour = Math.floor(classStartTime / 100);
  const startMinute = classStartTime % 100;

  const classStart = new Date(classDate);
  classStart.setHours(startHour, startMinute, 0, 0);

  // 미래 수업인 경우
  if (classStart > now) {
    return "예정";
  }

  // 과거 수업인 경우 - 기록이 있으면 출석, 없으면 결석
  return items.length > 0 ? "참석" : "불참";
};

// 출석 상태별 정보 가져오기
const getAttendanceDisplayInfo = (status: string) => {
  switch (status) {
    case "참석":
      return { text: "참석", variant: "success" as const };
    case "불참":
      return { text: "불참", variant: "error" as const };
    case "예정":
      return { text: "예정", variant: "default" as const };
    default:
      return { text: status, variant: "default" as const };
  }
};

// 날짜 포맷 함수
const formatDate = (dateString: string | Date) => {
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

// 시간 포맷 함수
const formatTime = (time: number) => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

// PT 상태 결정
const getPtStatus = (pt: TPtDetail) => {
  if (pt.state === "CONFIRMED") {
    const attendedCount = pt.ptRecord.filter(record => {
      const status = calculateAttendanceStatus(record.ptSchedule, record.items);
      return status === "참석";
    }).length;

    if (attendedCount >= pt.ptProduct.totalCount) {
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

// 출석 통계 계산
const calculateAttendanceStats = (ptRecords: TPtRecord[]) => {
  const attended = ptRecords.filter(record => {
    const status = calculateAttendanceStatus(record.ptSchedule, record.items);
    return status === "참석";
  }).length;

  const completedSessions = ptRecords.filter(record => {
    const status = calculateAttendanceStatus(record.ptSchedule, record.items);
    return status !== "예정";
  }).length;

  const attendanceRate = completedSessions > 0
    ? Math.round((attended / completedSessions) * 100)
    : 0;

  return { attended, completedSessions, attendanceRate };
};

// 만료일 계산
const getExpiryDate = (startDate: string | Date, totalCount: number) => {
  const start = new Date(startDate);
  const months = totalCount < 11 ? 1 : totalCount < 21 ? 3 : 4;
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
};

const TrainerPtDetailPage = async ({ params }: PageProps) => {
  const { id: ptId } = await params;

  let ptDetail: TPtDetail;

  try {
    ptDetail = await getPtDetailAction(ptId);
  } catch (error) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            PT 정보를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href="/trainer/pt">
            <Button variant="primary">목록으로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const status = getPtStatus(ptDetail);
  const expiryDate = getExpiryDate(ptDetail.startDate, ptDetail.ptProduct.totalCount);
  const attendanceStats = calculateAttendanceStats(ptDetail.ptRecord);

  return (
    <PageLayout maxWidth="lg">
      {/* 헤더 - 모바일 최적화 */}
      <div className="px-3 py-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <Link href="/trainer/pt">
            <Button variant="outline" size="sm">
              ← 목록
            </Button>
          </Link>
        </div>
        <h1 className="text-lg font-bold text-gray-900 truncate">
          {ptDetail.ptProduct.title}
        </h1>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-600">PT 상세</span>
          <Badge variant={status.variant}>{status.text}</Badge>
        </div>
      </div>

      {/* PT 기본 정보 - 모바일 최적화 */}
      <Card className="mx-2 my-2 shadow-sm">
        <CardContent className="p-3">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {ptDetail.ptProduct.title}
              </h2>
              <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                <span>회당 {ptDetail.ptProduct.time}시간</span>
                <span>총 {ptDetail.ptProduct.totalCount}회</span>
                <span className="font-medium text-gray-900">
                  {ptDetail.ptProduct.price.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 진행 상태 - 모바일 최적화 */}
          <div className="bg-gray-50 rounded-lg p-2 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">진행 상태</span>
              <span className="text-sm font-medium text-gray-900">
                {attendanceStats.attended}/{ptDetail.ptProduct.totalCount}회
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (attendanceStats.attended / ptDetail.ptProduct.totalCount) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
            {/* 출석률 표시 */}
            {attendanceStats.completedSessions > 0 && (
              <div className="text-xs text-gray-500">
                출석률: {attendanceStats.attendanceRate}% (
                {attendanceStats.attended}/{attendanceStats.completedSessions})
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 회원 정보 - 모바일 최적화 */}
      <Card className="mx-2 mb-2 shadow-sm">
        <CardContent className="p-3">
          <h3 className="font-medium text-gray-900 mb-3">회원 정보</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {ptDetail.member?.user.avatarImage?.cloudflareId ? (
                <Image
                  src={getOptimizedImageUrl(ptDetail.member.user.avatarImage.cloudflareId, "avatar")}
                  alt={ptDetail.member.user.username}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {ptDetail.member?.user.username[0]}
                  </span>
                </div>
              )}
              <span className="font-medium text-gray-900 text-sm">
                {ptDetail.member?.user.username || "회원 정보 없음"}
              </span>
            </div>
            {ptDetail.member && (
              <Link href={`/trainer/chat/connect?opp=${ptDetail.member.user.id}`}>
                <Button variant="outline" size="sm">
                  채팅하기
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 기간 정보 - 모바일 최적화 */}
      {status.text === "진행중" && (
        <Card className="mx-2 mb-2 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block mb-1">시작일</span>
                <div className="font-medium text-gray-900">
                  {new Date(ptDetail.startDate).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">만료 예정일</span>
                <div className="font-medium text-gray-900">
                  {expiryDate.toLocaleDateString("ko-KR")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 수업 기록 - 모바일 최적화 */}
      <Card className="mx-2 mb-2 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">수업 기록</h3>
            <span className="text-sm text-gray-600">
              {ptDetail.ptRecord.length}개
            </span>
          </div>

          {ptDetail.ptRecord.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              아직 수업 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {ptDetail.ptRecord.map((record) => {
                const dateInfo = formatDate(record.ptSchedule.date);
                const attendanceStatus = calculateAttendanceStatus(
                  record.ptSchedule,
                  record.items
                );
                const attendanceInfo = getAttendanceDisplayInfo(attendanceStatus);

                // 일정 변경 요청 중 PENDING 또는 APPROVED 상태 확인
                const pendingRequest = record.scheduleChangeRequest.find(
                  req => req.state === "PENDING"
                );
                const approvedRequest = record.scheduleChangeRequest.find(
                  req => req.state === "APPROVED"
                );

                return (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <Link href={`/trainer/pt/${ptId}/${record.id}`}>
                      <div className="p-2 cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    dateInfo.isToday
                                      ? "text-blue-600"
                                      : dateInfo.isPast
                                      ? "text-gray-900"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {dateInfo.text}
                                </span>
                                <Badge
                                  variant={attendanceInfo.variant}
                                  className="text-xs"
                                >
                                  {attendanceInfo.text}
                                </Badge>
                                {/* 일정 변경 배지 - 상태별로 다르게 표시 */}
                                {pendingRequest && (
                                  <Badge variant="warning" className="text-xs">
                                    일정 변경중
                                  </Badge>
                                )}
                                {approvedRequest && !pendingRequest && (
                                  <Badge variant="success" className="text-xs">
                                    일정 변경완료
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-600">
                                {formatTime(record.ptSchedule.startTime)} -{" "}
                                {formatTime(record.ptSchedule.endTime)}
                              </span>
                            </div>
                            {record.memo && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {record.memo}
                              </p>
                            )}
                          </div>
                          <div className="text-gray-400 ml-2">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </Link>
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

export default TrainerPtDetailPage;