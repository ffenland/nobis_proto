"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  Calendar,
  Clock,
  User,
  MessageCircle,
  Dumbbell,
  MapPin,
} from "lucide-react";
import type { GetPtResult } from "@/app/services/member/dashboard.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// PT 카드 컴포넌트
const PtCard = () => {
  const {
    data: pt,
    error,
    isLoading,
  } = useSWR<GetPtResult>("/api/member/dashboard/pt", fetcher);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">PT 정보를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-red-600">PT 정보를 불러올 수 없습니다.</p>
            <p className="text-sm text-gray-500 mt-1">
              잠시 후 다시 시도해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PT가 없는 경우
  if (!pt) {
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
  }

  // PENDING 상태인 경우
  if (pt.state === "PENDING") {
    const handleContactTrainer = () => {
      if (pt.trainer?.user.mobile) {
        const message = encodeURIComponent(
          `안녕하세요! PT 신청에 관해 문의드립니다.`
        );
        window.location.href = `sms:${pt.trainer.user.mobile}?body=${message}`;
      }
    };

    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-amber-800 mb-4">
            <Clock className="w-5 h-5" />
            <h3 className="text-lg font-semibold">승인 대기 중인 PT</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>
                {pt.trainer?.user.username || "알 수 없는 트레이너"} 트레이너
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                신청일: {new Date(pt.startDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                만료일:{" "}
                {pt.expirationDate
                  ? new Date(pt.expirationDate).toLocaleDateString()
                  : "미정"}
              </p>
            </div>

            {pt.trainer?.user.mobile && (
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
  }

  // CONFIRMED 상태인 경우
  if (pt.state === "CONFIRMED") {
    const nextLesson = pt.lessons[0];

    return (
      <Link href="/member/pt">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                진행 중인 PT
              </h3>
              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                진행중
              </div>
            </div>

            <div className="space-y-3">
              {/* 트레이너 정보 */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>
                  {pt.trainer?.user.username || "알 수 없는 트레이너"} 트레이너
                </span>
              </div>

              {/* PT 기간 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(pt.startDate).toLocaleDateString()} ~{" "}
                    {pt.expirationDate
                      ? new Date(pt.expirationDate).toLocaleDateString()
                      : "미정"}
                  </span>
                </div>
              </div>

              {/* 다음 수업 정보 */}
              {nextLesson ? (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">다음 수업</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-1">
                    {new Date(nextLesson.scheduledAt).toLocaleDateString()}{" "}
                    {new Date(nextLesson.scheduledAt).toLocaleTimeString(
                      "ko-KR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <MapPin className="w-4 h-4" />
                    <span>{nextLesson.fitnessCenter.title}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    예정된 수업이 없습니다
                  </p>
                  <p className="text-xs text-gray-500">
                    트레이너에게 연락하여 다음 수업을 예약하세요
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return null;
};

// 메인 대시보드 페이지
export default function MemberDashboardPage() {
  return (
    <div className="flex-1">
      {/* 메인 컨텐츠 영역 - 모바일 우선, 데스크톱에서 가운데 정렬 */}
      <div className="w-full max-w-md mx-auto bg-white">
        <div className="p-4 space-y-6">
          {/* 헤더 */}
          <div className="pt-4">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 text-sm mt-1">PT 현황을 확인하세요</p>
          </div>

          {/* PT 카드 */}
          <PtCard />
        </div>
      </div>
    </div>
  );
}
