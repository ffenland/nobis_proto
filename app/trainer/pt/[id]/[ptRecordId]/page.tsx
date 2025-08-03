// app/trainer/pt/[id]/[ptRecordId]/page.tsx
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
  CheckCircle,
  XCircle,
  Circle,
  Play,
} from "lucide-react";
import { getPtRecordDetailAction, type TPtRecordDetail } from "./actions";
import ActionButtons from "./ActionButtons";

interface PageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

const TrainerPtRecordHubPage = async ({ params }: PageProps) => {
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
          <Link href={`/trainer/pt/${ptId}`}>
            <Button variant="primary">PT 상세로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // 출석 상태 계산
  const calculateAttendanceStatus = () => {
    const now = new Date();
    const scheduleDateTime = new Date(ptRecordDetail.ptSchedule.date);
    
    // 수업 시작 시간을 분으로 변환하여 날짜에 추가
    const startHour = Math.floor(ptRecordDetail.ptSchedule.startTime / 100);
    const startMinute = ptRecordDetail.ptSchedule.startTime % 100;
    scheduleDateTime.setHours(startHour, startMinute, 0, 0);
    
    // 수업 종료 시간 계산 (수업시간 + 10분)
    const endDateTime = new Date(scheduleDateTime);
    const classTimeMinutes = ptRecordDetail.pt.ptProduct.time || 60; // 기본 60분
    endDateTime.setMinutes(endDateTime.getMinutes() + classTimeMinutes + 10);
    
    // 미래 수업인 경우
    if (scheduleDateTime > now) {
      return "예정";
    }
    
    // 수업 중인 경우
    if (now >= scheduleDateTime && now <= endDateTime) {
      return "수업중";
    }
    
    // 과거 수업인 경우 - 기록이 있으면 참석, 없으면 불참
    return ptRecordDetail.items.length > 0 ? "참석" : "불참";
  };

  const attendanceStatus = calculateAttendanceStatus();

  // 상태별 아이콘 및 색상
  const getStatusIcon = () => {
    switch (attendanceStatus) {
      case "참석":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "불참":
        return <XCircle className="w-6 h-6 text-red-600" />;
      case "수업중":
        return <Play className="w-6 h-6 text-orange-600" />;
      default:
        return <Circle className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (attendanceStatus) {
      case "참석":
        return <Badge variant="success">참석</Badge>;
      case "불참":
        return <Badge variant="error">불참</Badge>;
      case "수업중":
        return <Badge variant="warning">수업중</Badge>;
      default:
        return <Badge variant="default">예정</Badge>;
    }
  };

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="PT 세션 관리"
        subtitle={`${formatDateThisYear(ptRecordDetail.ptSchedule.date)} 수업`}
      />

      <div className="space-y-6">
        {/* 수업 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold">수업 정보</h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">수업 날짜</div>
                <div className="font-medium">
                  {formatDateThisYear(ptRecordDetail.ptSchedule.date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">수업 시간</div>
                <div className="font-medium">
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.startTime / 100),
                    ptRecordDetail.ptSchedule.startTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.endTime / 100),
                    ptRecordDetail.ptSchedule.endTime % 100
                  )}
                </div>
              </div>
            </div>

            {ptRecordDetail.memo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  메모
                </div>
                <div className="text-sm text-gray-600">
                  {ptRecordDetail.memo}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 액션 카드 */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">수업 관리</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 상태별 설명 */}
              {attendanceStatus === "예정" && (
                <>
                  {/* 일정 변경 요청 알림 (PENDING 상태인 경우) */}
                  {ptRecordDetail.scheduleChangeRequest.length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-orange-900">
                            일정 변경 요청됨
                          </div>
                          <div className="text-sm text-orange-800 mt-1">
                            현재 일정을{" "}
                            <strong>
                              {formatDateThisYear(
                                ptRecordDetail.scheduleChangeRequest[0]
                                  .requestedDate
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
                            으로 변경해달라고 요청을 보낸 상태입니다. 빠른
                            확인이 필요한 경우 직접 연락하세요.
                          </div>
                          <div className="mt-2">
                            <Link
                              href={`/trainer/pt/${ptId}/${ptRecordId}/scheduleChange`}
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
                          아직 진행되지 않은 수업입니다. 필요시 일정을 변경할 수
                          있습니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {attendanceStatus === "수업중" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Play className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-orange-900">
                        수업 진행 중
                      </div>
                      <div className="text-sm text-orange-800 mt-1">
                        현재 수업이 진행 중입니다. 운동 기록을 작성할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {attendanceStatus === "참석" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-900">
                        참석 완료
                      </div>
                      <div className="text-sm text-green-800 mt-1">
                        수업이 완료되었고 운동 기록이 있습니다. 기록을
                        조회하거나 편집할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {attendanceStatus === "불참" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-900">불참</div>
                      <div className="text-sm text-red-800 mt-1">
                        수업 시간이 지났지만 운동 기록이 없습니다. 필요시 운동
                        기록을 추가할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 액션 버튼들 */}
              <ActionButtons 
                ptId={ptId}
                ptRecordId={ptRecordId}
                attendanceStatus={attendanceStatus}
                hasRecords={ptRecordDetail.items.length > 0}
              />
            </div>
          </CardContent>
        </Card>

        {/* 운동 기록 요약 (참석한 경우에만) */}
        {attendanceStatus === "참석" && ptRecordDetail.items.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">운동 기록 요약</h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {ptRecordDetail.items.length}개
                </div>
                <div className="text-sm text-gray-600">운동 항목</div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                {["MACHINE", "FREE", "STRETCHING"].map((type) => {
                  const count = ptRecordDetail.items.filter(
                    (item) => item.type === type
                  ).length;
                  const label =
                    type === "MACHINE"
                      ? "머신"
                      : type === "FREE"
                      ? "프리웨이트"
                      : "스트레칭";
                  return (
                    <div
                      key={type}
                      className="text-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="font-medium text-gray-900">{count}개</div>
                      <div className="text-xs text-gray-600">{label}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 뒤로가기 버튼 */}
        <div className="flex">
          <Link href={`/trainer/pt/${ptId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              PT 상세로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default TrainerPtRecordHubPage;
