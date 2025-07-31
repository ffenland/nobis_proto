// app/trainer/pt/rejected/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import Image from "next/image";
import { formatDateThisYear } from "@/app/lib/utils";
import { 
  User, 
  Calendar, 
  Clock, 
  XCircle, 
  BookOpen, 
  MessageSquare,
  ArrowLeft 
} from "lucide-react";
import { getRejectedPtsAction, type TRejectedPt } from "./actions";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

// PT 카드 컴포넌트
interface RejectedPtCardProps {
  pt: TRejectedPt;
}

const RejectedPtCard = ({ pt }: RejectedPtCardProps) => {
  // 스케줄 정보 파싱 (첫 번째와 마지막 일정만 표시)
  const schedules = pt.rejectInfo!.schedule.split(", ");
  const firstSchedule = schedules[0];
  const lastSchedule = schedules[schedules.length - 1];
  const hasMultipleSchedules = schedules.length > 1;

  return (
    <Card className="border-red-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 헤더 - 회원 정보와 상태 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {pt.member!.user.avatarImage?.cloudflareId ? (
                <Image
                  src={getOptimizedImageUrl(pt.member!.user.avatarImage.cloudflareId, "avatar")}
                  alt={pt.member!.user.username}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">
                  {pt.member!.user.username}님
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateThisYear(pt.createdAt)} 신청
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="error">거절됨</Badge>
              <div className="text-xs text-gray-500">
                {formatDateThisYear(pt.rejectInfo!.createdAt)}
              </div>
            </div>
          </div>

          {/* PT 프로그램 정보 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {pt.ptProduct.title}
              </div>
              <div className="text-sm text-gray-600">
                총 {pt.ptProduct.totalCount}회 • {pt.ptProduct.time}분 •{" "}
                {pt.ptProduct.price.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 원래 예정되었던 일정 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                원래 예정 일정 ({schedules.length}개)
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <div>{firstSchedule}</div>
              {hasMultipleSchedules && (
                <>
                  {schedules.length > 2 && (
                    <div className="text-center text-xs text-gray-500 py-1">
                      ... {schedules.length - 2}개 더 ...
                    </div>
                  )}
                  <div>{lastSchedule}</div>
                </>
              )}
            </div>
          </div>

          {/* 거절 사유 */}
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">거절 사유</span>
            </div>
            <div className="text-sm text-red-800">
              {pt.rejectInfo!.reason}
            </div>
          </div>

          {/* 시작 예정일 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">원래 시작 예정일</div>
              <div className="font-medium text-gray-900">
                {formatDateThisYear(pt.startDate)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TrainerRejectedPtsPage = async () => {
  let rejectedPts: TRejectedPt[];

  try {
    rejectedPts = await getRejectedPtsAction();
  } catch (error) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            거절된 PT 목록을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="거절된 PT 신청"
        subtitle={`${rejectedPts.length}건의 거절된 신청 목록`}
      />

      <div className="space-y-4">
        {/* 뒤로가기 버튼 */}
        <div className="flex">
          <Link href="/trainer/pt/pending">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              승인 대기 목록으로
            </Button>
          </Link>
        </div>

        {/* 거절된 PT 목록 */}
        {rejectedPts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                거절된 PT 신청이 없습니다
              </h3>
              <p className="text-gray-600">모든 신청이 승인되었거나 아직 처리되지 않았습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rejectedPts.map((pt) => (
              <RejectedPtCard key={pt.id} pt={pt} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default TrainerRejectedPtsPage;