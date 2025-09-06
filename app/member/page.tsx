"use client";

import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { 
  Calendar, 
  Clock, 
  User, 
  MessageCircle,
  ChevronRight,
  Dumbbell,
  CheckCircle
} from "lucide-react";
import { MemberDashboardData } from "@/app/services/member/dashboard/dashboard.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// CONFIRMED PT with Records 컴포넌트
const ConfirmedWithRecordsCard = ({ 
  ptInfo, 
  upcomingLesson, 
  recentLesson 
}: Extract<MemberDashboardData, { type: 'confirmed-with-records' }>) => {
  return (
    <Link href="/member/pt">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{ptInfo.title}</h3>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {/* 트레이너 정보 */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{ptInfo.trainer.name} 트레이너</span>
            </div>
            
            {/* 진행률 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">진행률</span>
                <span className="font-medium">{ptInfo.progress.completed}/{ptInfo.progress.total}회 ({ptInfo.progress.percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${ptInfo.progress.percentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* 다음 수업 또는 최근 수업 */}
            {upcomingLesson ? (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">다음 수업</span>
                </div>
                <p className="text-sm text-blue-700">
                  {upcomingLesson.date} {upcomingLesson.time} ({upcomingLesson.duration}분)
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">예정된 수업이 없습니다</p>
                <p className="text-xs text-gray-500">트레이너에게 연락하여 다음 수업을 예약하세요</p>
              </div>
            )}
            
            {/* 최근 수업 기록 */}
            <div className="border-t pt-3">
              <p className="text-sm text-gray-600 mb-2">최근 수업 ({recentLesson.date})</p>
              <div className="flex flex-wrap gap-2">
                {recentLesson.exercises.slice(0, 3).map((exercise, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-xs rounded-md text-gray-700"
                  >
                    {exercise}
                  </span>
                ))}
                {recentLesson.exercises.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded-md text-gray-700">
                    +{recentLesson.exercises.length - 3}개 더
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// CONFIRMED PT without Records 컴포넌트
const ConfirmedNoRecordsCard = ({ 
  ptInfo, 
  upcomingLesson 
}: Extract<MemberDashboardData, { type: 'confirmed-no-records' }>) => {
  return (
    <Link href="/member/pt">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{ptInfo.title}</h3>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {/* 트레이너 정보 */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{ptInfo.trainer.name} 트레이너</span>
            </div>
            
            {/* 첫 수업 안내 */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">첫 수업이 예정되어 있습니다!</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Calendar className="w-4 h-4" />
                <span>{upcomingLesson.date} {upcomingLesson.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700 mt-1">
                <Clock className="w-4 h-4" />
                <span>{upcomingLesson.duration}분</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// PENDING PT 컴포넌트
const PendingPtCard = ({ pendingPt }: Extract<MemberDashboardData, { type: 'pending-pt' }>) => {
  const handleContactTrainer = () => {
    if (pendingPt.trainer.phone) {
      const message = encodeURIComponent(`안녕하세요! ${pendingPt.title} PT 신청에 관해 문의드립니다.`);
      window.location.href = `sms:${pendingPt.trainer.phone}?body=${message}`;
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-amber-800 mb-4">
          <Clock className="w-5 h-5" />
          <h3 className="text-lg font-semibold">승인 대기 중인 PT 신청</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-900">{pendingPt.title}</p>
            <p className="text-sm text-gray-600">
              {pendingPt.price.toLocaleString()}원 • 신청일: {pendingPt.appliedDate}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{pendingPt.trainer.name} 트레이너</span>
          </div>
          
          {pendingPt.trainer.phone && (
            <Button
              onClick={handleContactTrainer}
              variant="outline"
              size="sm"
              className="w-full mt-4"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              트레이너에게 연락하기
            </Button>
          )}
          
          <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
            💡 트레이너가 승인하면 수업 일정을 잡을 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// No PT 컴포넌트
const NoPtCard = () => {
  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardContent className="p-8 text-center">
        <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          새로운 PT를 시작해보세요!
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          전문 트레이너와 함께하는 개인 맞춤 운동을 경험해보세요.
        </p>
        <Link href="/member/pt/new">
          <Button size="lg" className="w-full">
            새로운 PT 신청하기
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

// 메인 대시보드 페이지
export default function MemberDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<MemberDashboardData>(
    "/api/member/dashboard",
    fetcher
  );

  if (isLoading) {
    return <LoadingPage message="대시보드 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <PageLayout>
        <ErrorMessage
          message="대시보드 정보를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const renderDashboard = () => {
    if (!data) return null;

    switch (data.type) {
      case 'confirmed-with-records':
        return <ConfirmedWithRecordsCard {...data} />;
      case 'confirmed-no-records':
        return <ConfirmedNoRecordsCard {...data} />;
      case 'pending-pt':
        return <PendingPtCard {...data} />;
      case 'no-pt':
        return <NoPtCard />;
      default:
        return null;
    }
  };

  return (
    <PageLayout>
      <PageHeader 
        title="대시보드" 
        subtitle="PT 현황을 한눈에 확인하세요" 
      />
      
      <div className="space-y-6">
        {renderDashboard()}
      </div>
    </PageLayout>
  );
}