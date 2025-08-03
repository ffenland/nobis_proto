import {
  convertKSTtoUTC,
  formatDateThisYear,
  formatTimeToString,
  getRemainText,
} from "@/app/lib/utils";
import { getPtList } from "./actions";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import Link from "next/link";
import dayjs from "dayjs";
import { User, Clock, BookOpen, Calendar, ChevronRight } from "lucide-react";

const TrainerPt = async () => {
  const today = convertKSTtoUTC(new Date(new Date().setHours(0, 0, 0, 0)));
  const ptList = await getPtList();

  // 중복 회원 체크
  const memberIdCount: Record<string, number> = {};
  ptList.forEach((pt) => {
    if (pt.memberId) {
      memberIdCount[pt.memberId] = (memberIdCount[pt.memberId] || 0) + 1;
    }
  });

  // actions.ts에서 이미 정렬되어 온 상태 (CONFIRMED 먼저, 그 다음 FINISHED)

  // 오늘 수업과 예정 수업 분리
  const todayClasses = ptList.filter(
    (pt) =>
      dayjs(pt.date).format("YYYY-MM-DD") === dayjs(today).format("YYYY-MM-DD")
  );

  const upcomingClasses = ptList.filter(
    (pt) =>
      dayjs(pt.date).format("YYYY-MM-DD") !== dayjs(today).format("YYYY-MM-DD")
  );

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="진행중인 PT 수업"
        subtitle="회원별 활성 PT 프로그램 관리"
      />

      {/* 승인 대기 PT 보기 버튼 */}
      <div className="mb-4">
        <Link href="/trainer/pt/pending">
          <Button variant="outline" className="w-full">
            승인 대기 PT 보기
          </Button>
        </Link>
      </div>

      {/* 빈 상태 */}
      {ptList.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  진행중인 PT 수업이 없습니다
                </h3>
                <p className="text-sm text-gray-500">
                  회원의 PT 신청을 기다리고 있습니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 오늘 수업 섹션 */}
      {todayClasses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              오늘 수업 ({todayClasses.length}개)
            </h2>
          </div>

          <div className="space-y-3">
            {todayClasses.map((pt) => (
              <PtCard
                key={pt.ptId}
                pt={pt}
                memberIdCount={memberIdCount}
                isToday={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* 예정 수업 섹션 */}
      {upcomingClasses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              예정 수업 ({upcomingClasses.length}개)
            </h2>
          </div>

          <div className="space-y-3">
            {upcomingClasses.map((pt) => (
              <PtCard
                key={pt.ptId}
                pt={pt}
                memberIdCount={memberIdCount}
                isToday={false}
              />
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

// PT 카드 컴포넌트
interface PtCardProps {
  pt: {
    ptId: string;
    ptState: string;
    ptTitle: string;
    memberId?: string;
    memberName?: string;
    date: Date;
    startTime: number;
    endTime: number;
    order: number;
  };
  memberIdCount: Record<string, number>;
  isToday: boolean;
}

const PtCard = ({ pt, memberIdCount, isToday }: PtCardProps) => {
  return (
    <Link href={`/trainer/pt/${pt.ptId}`}>
      <Card className="hover:bg-gray-50 transition-colors cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              {/* 회원 정보 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {pt.memberName}님
                  </span>
                  {pt.memberId && memberIdCount[pt.memberId] > 1 && (
                    <Badge variant="error">중복 회원</Badge>
                  )}
                </div>
              </div>

              {/* PT 프로그램 정보 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">
                    {pt.ptTitle}
                  </span>
                  <Badge variant="default">{pt.order}번째 수업</Badge>
                  <Badge variant={pt.ptState === "CONFIRMED" ? "success" : "default"}>
                    {pt.ptState === "CONFIRMED" ? "진행중" : "완료"}
                  </Badge>
                </div>
              </div>

              {/* 일정 정보 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">
                    {formatDateThisYear(pt.date)}
                  </span>
                  {isToday ? (
                    <Badge variant="success">오늘 수업</Badge>
                  ) : (
                    <Badge variant="default">
                      {getRemainText(pt.date, pt.startTime)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 수업 시간 */}
              <div className="flex items-center gap-2 text-sm text-gray-600 ml-11">
                <span>
                  {formatTimeToString(
                    Math.floor(pt.startTime / 100),
                    pt.startTime % 100
                  )}
                </span>
                <span>~</span>
                <span>
                  {formatTimeToString(
                    Math.floor(pt.endTime / 100),
                    pt.endTime % 100
                  )}
                </span>
              </div>
            </div>

            {/* 화살표 아이콘 */}
            <div className="ml-4">
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TrainerPt;
