// app/member/pt/[id]/[ptRecordId]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  Clock,
  FileText,
  ArrowLeft,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Circle,
} from "lucide-react";
import { getPtRecordDetailAction, type TPtRecordDetail } from "./actions";
import { formatMinutesToKorean } from "@/app/lib/utils/time.utils";
import PtRecordDetailClient from "./PtRecordDetailClient";

interface PageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

const MemberPtRecordDetailPage = async ({ params }: PageProps) => {
  const { id: ptId, ptRecordId } = await params;

  let ptRecordDetail: TPtRecordDetail;

  try {
    ptRecordDetail = await getPtRecordDetailAction(ptRecordId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            PT 기록을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href={`/member/pt/${ptId}`}>
            <Button variant="primary">PT 상세로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // 출석 상태 계산 함수
  const calculateAttendanceStatus = (): "참석" | "불참" | "예정" => {
    const now = new Date();
    const classDate = new Date(ptRecordDetail.ptSchedule.date);
    const classStartTime = ptRecordDetail.ptSchedule.startTime;

    const startHour = Math.floor(classStartTime / 100);
    const startMinute = classStartTime % 100;

    const classStart = new Date(classDate);
    classStart.setHours(startHour, startMinute, 0, 0);
    // for test
    return "참석";
    // 미래 수업인 경우
    if (classStart > now) {
      return "예정";
    }

    // 과거 수업인 경우 - 기록이 있으면 출석, 없으면 결석
    return ptRecordDetail.items.length > 0 ? "참석" : "불참";
  };

  const attendanceStatus = calculateAttendanceStatus();

  // 출석 상태별 스타일
  const getAttendanceStyle = (status: string) => {
    switch (status) {
      case "참석":
        return {
          bgColor: "bg-green-50 border-green-200",
          badgeVariant: "success" as const,
          icon: CheckCircle,
        };
      case "불참":
        return {
          bgColor: "bg-red-50 border-red-200",
          badgeVariant: "error" as const,
          icon: XCircle,
        };
      case "예정":
        return {
          bgColor: "bg-blue-50 border-blue-200",
          badgeVariant: "default" as const,
          icon: Circle,
        };
      default:
        return {
          bgColor: "bg-gray-50 border-gray-200",
          badgeVariant: "default" as const,
          icon: Circle,
        };
    }
  };

  const attendanceStyle = getAttendanceStyle(attendanceStatus);

  return (
    <PageLayout maxWidth="2xl">
      {/* 헤더 */}
      <PageHeader
        title="PT 수업 상세"
        subtitle={ptRecordDetail.pt.ptProduct.title}
        action={
          <Link href={`/member/pt/${ptId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              돌아가기
            </Button>
          </Link>
        }
      />

      {/* 수업 기본 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">수업 정보</h2>
            <Badge variant={attendanceStyle.badgeVariant}>
              {attendanceStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {formatDateThisYear(new Date(ptRecordDetail.ptSchedule.date))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.startTime / 100),
                    ptRecordDetail.ptSchedule.startTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.endTime / 100),
                    ptRecordDetail.ptSchedule.endTime % 100
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span className="text-sm">
                  트레이너:{" "}
                  {ptRecordDetail.pt.trainer?.user.username || "미배정"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FileText className="w-4 h-4" />
                <span className="text-sm">
                  {ptRecordDetail.pt.ptProduct.title} (
                  {formatMinutesToKorean(ptRecordDetail.pt.ptProduct.time)})
                </span>
              </div>
            </div>
          </div>
          {ptRecordDetail.memo && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{ptRecordDetail.memo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 출석 상태별 안내 */}
      <Card className="mb-6">
        <CardContent>
          <div className="space-y-4">
            {/* 예정된 수업인 경우 */}
            {attendanceStatus === "예정" && (
              <>
                {/* 일정 변경 요청 알림 */}
                {ptRecordDetail.scheduleChangeRequest.length > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-900">
                          일정 변경 요청됨
                        </div>
                        <div className="text-sm text-orange-800 mt-1">
                          {ptRecordDetail.scheduleChangeRequest[0].requestor
                            .role === "MEMBER"
                            ? "회원님이"
                            : "트레이너님이"}{" "}
                          <strong>
                            {formatDateThisYear(
                              new Date(
                                ptRecordDetail.scheduleChangeRequest[0].requestedDate
                              )
                            )}{" "}
                            {formatTimeToString(
                              Math.floor(
                                ptRecordDetail.scheduleChangeRequest[0]
                                  .requestedStartTime / 100
                              ),
                              ptRecordDetail.scheduleChangeRequest[0]
                                .requestedStartTime % 100
                            )}
                          </strong>
                          으로 변경을 요청했습니다.
                        </div>
                        <div className="mt-2">
                          <Link
                            href={`/member/pt/${ptId}/${ptRecordId}/scheduleChange`}
                          >
                            <Button variant="outline" size="sm">
                              <Calendar className="w-4 h-4 mr-1" />
                              일정 변경 관리
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Circle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">
                        예정된 수업
                      </div>
                      <div className="text-sm text-blue-800 mt-1">
                        아직 진행되지 않은 수업입니다.
                        {(() => {
                          const now = new Date();
                          const classDate = new Date(
                            ptRecordDetail.ptSchedule.date
                          );
                          const classStartTime =
                            ptRecordDetail.ptSchedule.startTime;
                          const startHour = Math.floor(classStartTime / 100);
                          const startMinute = classStartTime % 100;
                          classDate.setHours(startHour, startMinute, 0, 0);

                          const hoursUntilClass =
                            (classDate.getTime() - now.getTime()) /
                            (1000 * 60 * 60);

                          if (hoursUntilClass >= 24) {
                            return " 수업 24시간 전까지 일정 변경을 요청할 수 있습니다.";
                          } else {
                            return " 일정 변경 요청 가능 시간이 지났습니다.";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 참석한 수업인 경우 */}
            {attendanceStatus === "참석" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">수업 완료</div>
                    <div className="text-sm text-green-800 mt-1">
                      수업을 완료했습니다. 아래에서 운동 기록을 확인할 수
                      있습니다.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 불참한 수업인 경우 */}
            {attendanceStatus === "불참" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900">수업 불참</div>
                    <div className="text-sm text-red-800 mt-1">
                      수업에 참석하지 않았습니다.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 예정된 수업: 일정 변경 (24시간 전까지만) */}
              {attendanceStatus === "예정" &&
                (() => {
                  const now = new Date();
                  const classDate = new Date(ptRecordDetail.ptSchedule.date);
                  const classStartTime = ptRecordDetail.ptSchedule.startTime;
                  const startHour = Math.floor(classStartTime / 100);
                  const startMinute = classStartTime % 100;
                  classDate.setHours(startHour, startMinute, 0, 0);

                  const hoursUntilClass =
                    (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                  return hoursUntilClass >= 24 ? (
                    <Link
                      href={`/member/pt/${ptId}/${ptRecordId}/scheduleChange`}
                    >
                      <Button variant="primary" className="w-full">
                        <Calendar className="w-4 h-4 mr-2" />
                        일정 변경 요청
                      </Button>
                    </Link>
                  ) : null;
                })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 운동 기록 (참석한 경우만) */}
      {attendanceStatus === "참석" && ptRecordDetail.items.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">운동 기록</h2>
          </CardHeader>
          <CardContent>
            <PtRecordDetailClient ptRecordDetail={ptRecordDetail} />
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

export default MemberPtRecordDetailPage;
