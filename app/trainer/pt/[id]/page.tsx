// app/trainer/pt/[id]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  getPtDetailAction,
  type TPtDetail,
  type TPtRecord,
  type TPtRecordItem,
} from "./actions";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  User,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  Circle,
} from "lucide-react";
import { PtState } from "@prisma/client";
import RecordDetailToggle from "./RecordDetailToggle";
import ScheduleChangeComponents from "./ScheduleChangeComponent";
import ScheduleChangeRequests from "./ScheduleChangeRequests";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 출석 상태 계산 함수
const calculateAttendanceStatus = (
  ptSchedule: TPtRecord["ptSchedule"],
  items: TPtRecordItem[]
): "ATTENDED" | "ABSENT" | "RESERVED" => {
  const now = new Date();
  const classDate = new Date(ptSchedule.date);
  const classStartTime = ptSchedule.startTime;

  const startHour = Math.floor(classStartTime / 100);
  const startMinute = classStartTime % 100;

  const classStart = new Date(classDate);
  classStart.setHours(startHour, startMinute, 0, 0);

  // 미래 수업인 경우
  if (classStart > now) {
    return "RESERVED";
  }

  // 과거 수업인 경우 - 기록이 있으면 출석, 없으면 결석
  return items.length > 0 ? "ATTENDED" : "ABSENT";
};

// 출석 통계 계산 함수
const calculateAttendanceStats = (ptRecords: TPtRecord[]) => {
  const stats = {
    attended: 0,
    absent: 0,
    reserved: 0,
  };

  ptRecords.forEach((record) => {
    const status = calculateAttendanceStatus(record.ptSchedule, record.items);
    stats[status.toLowerCase() as keyof typeof stats]++;
  });

  return stats;
};

// 운동 기록 요약 렌더링 함수
const renderExerciseSummary = (items: TPtRecordItem[]) => {
  if (items.length === 0) {
    return "기록 없음";
  }

  const summary = items
    .slice(0, 2)
    .map((item) => item.title || item.description || "운동")
    .join(", ");
  const remaining = items.length - 2;

  return `${summary}${remaining > 0 ? ` 외 ${remaining}개` : ""}`;
};

const TrainerPtDetailPage = async ({ params }: PageProps) => {
  const { id: ptId } = await params;

  let ptDetail: TPtDetail;

  try {
    ptDetail = await getPtDetailAction(ptId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
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

  // 완료된 세션 수 계산 (출석한 세션)
  const completedCount = ptDetail.ptRecord.filter(
    (record) =>
      calculateAttendanceStatus(record.ptSchedule, record.items) === "ATTENDED"
  ).length;

  // 출석 통계 계산
  const attendanceStats = calculateAttendanceStats(ptDetail.ptRecord);

  // PT 상태 결정
  const getStatus = () => {
    if (ptDetail.state === PtState.PENDING) {
      return { text: "승인 대기", variant: "warning" as const };
    } else if (completedCount >= ptDetail.ptProduct.totalCount) {
      return { text: "완료", variant: "default" as const };
    } else {
      return { text: "진행 중", variant: "success" as const };
    }
  };

  const status = getStatus();
  const progressPercentage = Math.round(
    (completedCount / ptDetail.ptProduct.totalCount) * 100
  );

  // 출석 상태별 스타일
  const getAttendanceStyle = (status: string) => {
    switch (status) {
      case "ATTENDED":
        return {
          bgColor: "bg-green-50 border-green-200",
          textColor: "text-green-800",
          badge: "완료",
          badgeVariant: "success" as const,
          icon: CheckCircle,
        };
      case "ABSENT":
        return {
          bgColor: "bg-red-50 border-red-200",
          textColor: "text-red-800",
          badge: "결석",
          badgeVariant: "error" as const,
          icon: XCircle,
        };
      case "RESERVED":
        return {
          bgColor: "bg-blue-50 border-blue-200",
          textColor: "text-blue-800",
          badge: "예정",
          badgeVariant: "default" as const,
          icon: Circle,
        };
      default:
        return {
          bgColor: "bg-gray-50 border-gray-200",
          textColor: "text-gray-800",
          badge: "알 수 없음",
          badgeVariant: "default" as const,
          icon: Circle,
        };
    }
  };

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="PT 상세 정보"
        subtitle={`${ptDetail.member?.user.username}님의 ${ptDetail.ptProduct.title}`}
      />

      <div className="space-y-6">
        {/* PT 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {ptDetail.ptProduct.title}
              </h2>
              <Badge variant={status.variant}>{status.text}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">회원명</div>
                  <div className="font-medium">
                    {ptDetail.member?.user.username}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">시작일</div>
                  <div className="font-medium">
                    {formatDateThisYear(ptDetail.startDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">총 횟수</div>
                  <div className="font-medium">
                    {ptDetail.ptProduct.totalCount}회
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">수업 시간</div>
                  <div className="font-medium">
                    {ptDetail.ptProduct.time}시간
                  </div>
                </div>
              </div>
            </div>

            {/* 진행률 */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">진행률</span>
                <span className="font-medium">
                  {completedCount}/{ptDetail.ptProduct.totalCount}회 (
                  {progressPercentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* 출석 통계 */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {attendanceStats.attended}
                </div>
                <div className="text-sm text-green-600">출석</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">
                  {attendanceStats.absent}
                </div>
                <div className="text-sm text-red-600">결석</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {attendanceStats.reserved}
                </div>
                <div className="text-sm text-blue-600">예정</div>
              </div>
            </div>

            {/* 설명 (있는 경우) */}
            {ptDetail.description && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  PT 설명
                </div>
                <div className="text-sm text-gray-600">
                  {ptDetail.description}
                </div>
              </div>
            )}

            {/* 일정 변경 컴포넌트 - CONFIRMED 상태일 때만 표시 */}
            {ptDetail.state === PtState.CONFIRMED && (
              <ScheduleChangeComponents ptRecords={ptDetail.ptRecord} />
            )}
          </CardContent>
        </Card>

        {/* 일정 변경 요청 목록 - CONFIRMED 상태일 때만 표시 */}
        {ptDetail.state === PtState.CONFIRMED && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">일정 변경 요청</h3>
            </CardHeader>
            <CardContent>
              <ScheduleChangeRequests ptId={ptId} />
            </CardContent>
          </Card>
        )}

        {/* 수업 기록 목록 */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">수업 기록</h3>
          </CardHeader>
          <CardContent>
            {ptDetail.ptRecord.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Circle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>수업 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ptDetail.ptRecord.map((record) => {
                  const attendanceStatus = calculateAttendanceStatus(
                    record.ptSchedule,
                    record.items
                  );
                  const style = getAttendanceStyle(attendanceStatus);
                  const IconComponent = style.icon;

                  return (
                    <div
                      key={record.id}
                      className={`border rounded-lg p-4 ${style.bgColor} transition-all`}
                    >
                      <RecordDetailToggle
                        record={record}
                        attendanceStatus={attendanceStatus}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent className="w-5 h-5" />
                            <div className="font-medium">
                              {formatDateThisYear(record.ptSchedule.date)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatTimeToString(
                                Math.floor(record.ptSchedule.startTime / 100),
                                record.ptSchedule.startTime % 100
                              )}{" "}
                              -{" "}
                              {formatTimeToString(
                                Math.floor(record.ptSchedule.endTime / 100),
                                record.ptSchedule.endTime % 100
                              )}
                            </div>
                            <Badge variant={style.badgeVariant}>
                              {style.badge}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-700 mb-1">
                            {renderExerciseSummary(record.items)}
                          </div>
                          {record.memo && (
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <span>💬</span>
                              <span>{record.memo}</span>
                            </div>
                          )}

                          {/* 기록 작성/수정 버튼 */}
                          {attendanceStatus === "ATTENDED" ? (
                            <div className="mt-3">
                              <Link href={`/trainer/pt-records/${record.id}`}>
                                <Button variant="outline" size="sm">
                                  {record.items.length > 0
                                    ? "기록 수정"
                                    : "기록 작성"}
                                </Button>
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </RecordDetailToggle>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
        <div className="flex gap-4">
          <Link href="/trainer/pt">
            <Button variant="outline">목록으로 돌아가기</Button>
          </Link>
          {ptDetail.state === PtState.CONFIRMED &&
            completedCount < ptDetail.ptProduct.totalCount && (
              <Link href={`/trainer/schedule`}>
                <Button variant="primary">스케줄 보기</Button>
              </Link>
            )}
        </div>
      </div>
    </PageLayout>
  );
};

export default TrainerPtDetailPage;
