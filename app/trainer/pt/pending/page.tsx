// app/trainer/pt/pending/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import Image from "next/image";
import { formatDateThisYear } from "@/app/lib/utils";
import { User, Calendar, Clock, ChevronRight, BookOpen } from "lucide-react";
import { getPendingPtsAction, type TPendingPt } from "./actions";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";


// PT 카드 컴포넌트
interface PtCardProps {
  pt: TPendingPt;
}

const PtCard = ({ pt }: PtCardProps) => {
  return (
    <Link href={`/trainer/pt/pending/${pt.id}`}>
      <Card className="hover:bg-gray-50 transition-colors cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-4">
              {/* 회원 정보 */}
              <div className="flex items-center gap-3">
                {pt.member?.user.avatarImage?.cloudflareId ? (
                  <Image
                    src={getOptimizedImageUrl(pt.member.user.avatarImage.cloudflareId, "avatar")}
                    alt={pt.member.user.username}
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
                    {pt.member?.user.username}님
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDateThisYear(pt.createdAt)} 신청
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

              {/* 시작일 정보 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">시작 예정일</div>
                  <div className="font-medium text-gray-900">
                    {formatDateThisYear(pt.startDate)}
                  </div>
                </div>
              </div>

              {/* 예정 수업 수 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">예정 수업</div>
                  <div className="font-medium text-gray-900">
                    {pt.ptRecord.length}개 일정
                  </div>
                </div>
              </div>
            </div>

            {/* 상태 뱃지와 화살표 */}
            <div className="flex items-center gap-3">
              <Badge variant="warning">승인 대기</Badge>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const TrainerPendingPtsPage = async () => {
  let pendingPts: TPendingPt[];

  try {
    pendingPts = await getPendingPtsAction();
  } catch (error) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Clock className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            승인 대기 목록을 불러올 수 없습니다
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
        title="PT 신청 승인"
        subtitle={`${pendingPts.length}건의 승인 대기 중인 신청`}
      />

      {/* 승인 대기 목록 */}
      {pendingPts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              승인 대기 중인 PT 신청이 없습니다
            </h3>
            <p className="text-gray-600">모든 신청이 처리되었습니다!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPts.map((pt) => (
            <PtCard key={pt.id} pt={pt} />
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default TrainerPendingPtsPage;
