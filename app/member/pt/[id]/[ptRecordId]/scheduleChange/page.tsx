// app/member/pt/[id]/[ptRecordId]/scheduleChange/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getPtScheduleDetailAction,
  getScheduleChangeRequestsAction,
  getCurrentUserAction,
  type TPtScheduleDetail,
  type TScheduleChangeRequest,
} from "./actions";
import ScheduleChangeForm from "./ScheduleChangeForm";
import ScheduleChangeRequestsList from "./ScheduleChangeRequestsList";

interface PageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

const MemberScheduleChangePage = async ({ params }: PageProps) => {
  const { id: ptId, ptRecordId } = await params;

  let ptScheduleDetail: TPtScheduleDetail;
  let scheduleChangeRequests: TScheduleChangeRequest[];
  let currentUser: Awaited<ReturnType<typeof getCurrentUserAction>>;
  let isPendingExist = false;
  try {
    [ptScheduleDetail, scheduleChangeRequests, currentUser] = await Promise.all(
      [
        getPtScheduleDetailAction(ptRecordId),
        getScheduleChangeRequestsAction(ptRecordId),
        getCurrentUserAction(),
      ]
    );
    isPendingExist = scheduleChangeRequests.some(
      (request) => request.state === "PENDING"
    );
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            스케줄 정보를 불러올 수 없습니다
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

  // 현재 시간과 수업 시간 비교
  const now = new Date();
  const classDate = new Date(ptScheduleDetail.ptSchedule.date);
  const classStartTime = ptScheduleDetail.ptSchedule.startTime;
  const startHour = Math.floor(classStartTime / 100);
  const startMinute = classStartTime % 100;
  const classStart = new Date(classDate);
  classStart.setHours(startHour, startMinute, 0, 0);

  const isUpcoming = classStart > now;

  // 멤버는 24시간 전까지만 변경 가능
  const hoursUntilClass =
    (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canRequestChange = isUpcoming && hoursUntilClass >= 24;

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="일정 변경 요청"
        subtitle={`${formatDateThisYear(ptScheduleDetail.ptSchedule.date)} ${
          ptScheduleDetail.pt.ptProduct.title
        }`}
        action={
          <Link href={`/member/pt/${ptId}/${ptRecordId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              돌아가기
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* 현재 스케줄 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">현재 스케줄</h3>
              <Badge variant={isUpcoming ? "default" : "warning"}>
                {isUpcoming ? "예정" : "지난 수업"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">트레이너</div>
                  <div className="font-medium">
                    {ptScheduleDetail.pt.trainer?.user.username || "미배정"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">수업 날짜</div>
                  <div className="font-medium">
                    {formatDateThisYear(ptScheduleDetail.ptSchedule.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">수업 시간</div>
                  <div className="font-medium">
                    {formatTimeToString(
                      Math.floor(ptScheduleDetail.ptSchedule.startTime / 100),
                      ptScheduleDetail.ptSchedule.startTime % 100
                    )}{" "}
                    -{" "}
                    {formatTimeToString(
                      Math.floor(ptScheduleDetail.ptSchedule.endTime / 100),
                      ptScheduleDetail.ptSchedule.endTime % 100
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isUpcoming && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    이미 지난 수업입니다. 일정 변경이 불가능합니다.
                  </span>
                </div>
              </div>
            )}

            {isUpcoming && !canRequestChange && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    수업 24시간 전까지만 일정 변경을 요청할 수 있습니다.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 일정 변경 요청 목록 */}
        {scheduleChangeRequests.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">일정 변경 요청 내역</h3>
            </CardHeader>
            <CardContent>
              <ScheduleChangeRequestsList
                requests={scheduleChangeRequests}
                ptRecordId={ptRecordId}
                currentUser={currentUser}
              />
            </CardContent>
          </Card>
        )}

        {/* 새 일정 변경 요청 (조건: 예정 상태, 24시간 이상 남음, 기존 PENDING 요청 없음) */}
        {canRequestChange && !isPendingExist && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">새 일정 변경 요청</h3>
            </CardHeader>
            <CardContent>
              <ScheduleChangeForm
                ptRecordId={ptRecordId}
                currentSchedule={ptScheduleDetail.ptSchedule}
                ptProduct={ptScheduleDetail.pt.ptProduct}
                ptId={ptId}
              />
            </CardContent>
          </Card>
        )}

        {/* 기존 PENDING 요청이 있을 때 안내 메시지 */}
        {canRequestChange && isPendingExist && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">일정 변경 요청 진행 중</h3>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">
                      새 요청 불가
                    </div>
                    <div className="text-sm text-yellow-800 mt-1">
                      현재 처리 대기 중인 일정 변경 요청이 있어 새로운 요청을
                      작성할 수 없습니다. 기존 요청을 취소하거나 처리 완료 후 새
                      요청을 작성해주세요.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default MemberScheduleChangePage;
