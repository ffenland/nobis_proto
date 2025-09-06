// app/trainer/schedule/page.tsx
"use client";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import Link from "next/link";

export default function TrainerScheduleMenuPage() {
  const menuItems = [
    {
      title: "주간 스케줄 확인",
      description: "이번 주 PT 일정과 예약 현황을 확인하세요",
      href: "/trainer/schedule/weekly-schedule",
      icon: "📅",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      title: "오프 일정 관리",
      description: "휴무 일정을 등록하고 관리하세요",
      href: "/trainer/schedule/off",
      icon: "⏰",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
  ];

  return (
    <PageLayout>
      <PageHeader title="스케줄 관리" />
      
      <div className="space-y-6">
        <p className="text-gray-600">
          트레이너 스케줄 관련 기능들을 관리할 수 있습니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className={`transition-all duration-200 cursor-pointer ${item.color}`}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{item.icon}</span>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {item.title}
                    </h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{item.description}</p>
                  <div className="mt-4 flex items-center text-sm font-medium text-gray-500">
                    바로가기 →
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 추가 정보 섹션 */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">💡 스케줄 관리 팁</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>주간 스케줄</strong>: 이번 주 예정된 PT 세션들과 시간대를 한눈에 확인하세요</li>
                <li>• <strong>오프 일정</strong>: 정기 휴무일(요일별)이나 특정 날짜 휴무를 미리 등록하세요</li>
                <li>• 오프 일정을 등록하면 해당 시간대에는 새로운 PT 예약이 불가능합니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}