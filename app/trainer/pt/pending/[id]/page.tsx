// app/trainer/pt/pending/[id]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import Image from "next/image";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  User,
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  BookOpen,
  Target,
} from "lucide-react";
import { getPendingPtDetailAction, type TPendingPtDetail } from "./actions";
import ApprovalForm from "./ApprovalForm";
import RejectionForm from "./RejectionForm";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TrainerPendingPtDetailPage = async ({ params }: PageProps) => {
  const { id: ptId } = await params;

  let ptDetail: TPendingPtDetail;

  try {
    ptDetail = await getPendingPtDetailAction(ptId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            PT 신청을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href="/trainer/pt/pending">
            <Button variant="primary">목록으로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="PT 신청 상세"
        subtitle={`${ptDetail.member?.user.username}님의 ${ptDetail.ptProduct.title} 신청`}
      />

      <div className="space-y-6">
        {/* 회원 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">회원 정보</h3>
              <Badge variant="warning">승인 대기</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {ptDetail.member?.user.avatarImage?.cloudflareId ? (
                <Image
                  src={getOptimizedImageUrl(
                    ptDetail.member.user.avatarImage.cloudflareId,
                    "avatar"
                  )}
                  alt={ptDetail.member.user.username}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div>
                <div className="text-xl font-semibold text-gray-900">
                  {ptDetail.member?.user.username}님
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateThisYear(ptDetail.createdAt)} 신청
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PT 프로그램 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">PT 프로그램 정보</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  {ptDetail.ptProduct.title}
                </h4>
                {ptDetail.ptProduct.description && (
                  <p className="text-gray-600">
                    {ptDetail.ptProduct.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600">총 회수</div>
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
                      {ptDetail.ptProduct.time}분
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className="text-gray-500">₩</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">가격</div>
                    <div className="font-medium">
                      {ptDetail.ptProduct.price.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-600">시작 예정일</div>
                  <div className="font-medium">
                    {formatDateThisYear(ptDetail.startDate)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 예정 일정 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">예정 일정</h3>
              <Badge variant="default">{ptDetail.ptRecord.length}개 일정</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {ptDetail.ptRecord.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>예정된 일정이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ptDetail.ptRecord.map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 승인/거절 액션 */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">승인 또는 거절</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 승인 폼 */}
              <ApprovalForm ptId={ptId} ptDetail={ptDetail} />

              {/* 거절 폼 */}
              <RejectionForm ptId={ptId} ptDetail={ptDetail} />
            </div>
          </CardContent>
        </Card>

        {/* 뒤로가기 버튼 */}
        <div className="flex">
          <Link href="/trainer/pt/pending">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default TrainerPendingPtDetailPage;
