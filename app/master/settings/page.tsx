"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  Package,
  Dumbbell,
  Activity,
  Cog,
  Box,
} from "lucide-react";

interface SettingCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const settingCards: SettingCard[] = [
  {
    title: "피트니스 센터 추가",
    description: "새로운 피트니스 센터를 등록합니다",
    href: "/master/settings/new-center",
    icon: <Building2 className="w-8 h-8" />,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    title: "트레이너 레벨 설정",
    description: "트레이너 등급 및 레벨을 관리합니다",
    href: "/master/settings/trainer-level",
    icon: <Users className="w-8 h-8" />,
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
  },
  {
    title: "신규 트레이너 등록",
    description: "새로운 트레이너를 시스템에 등록합니다",
    href: "/master/settings/new-trainer",
    icon: <UserPlus className="w-8 h-8" />,
    color: "bg-green-50 border-green-200 hover:bg-green-100",
  },
  {
    title: "PT 상품 추가/삭제",
    description: "PT 상품을 관리합니다",
    href: "/master/product",
    icon: <Package className="w-8 h-8" />,
    color: "bg-rose-50 border-rose-200 hover:bg-rose-100",
  },
  {
    title: "기본 운동정보 (웨이트, 스트레칭)",
    description: "프리웨이트, 스트레칭 운동 정보를 등록합니다",
    href: "/master/exercise",
    icon: <Dumbbell className="w-8 h-8" />,
    color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
  },
  {
    title: "머신 등록",
    description: "센터별 운동 머신을 등록합니다",
    href: "/master/centers",
    icon: <Cog className="w-8 h-8" />,
    color: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100",
  },
  {
    title: "운동기구 등록",
    description: "센터별 운동 기구를 등록합니다",
    href: "/master/centers",
    icon: <Box className="w-8 h-8" />,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
  },
];

const MasterSettingPage = () => {
  return (
    <div className="w-full h-full overflow-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          시스템 초기 설정
        </h1>
        <p className="text-gray-600">
          피트니스 센터 운영에 필요한 기본 정보를 설정합니다
        </p>
      </div>

      {/* 설정 카드 그리드 - 모바일: 1열, 태블릿 이상: 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingCards.map((card, index) => (
          <Link key={index} href={card.href}>
            <div
              className={`card ${card.color} border-2 shadow-sm transition-all duration-200 cursor-pointer h-full`}
            >
              <div className="card-body p-6">
                <div className="flex items-start gap-4">
                  {/* 아이콘 */}
                  <div className="flex-shrink-0 text-gray-700">{card.icon}</div>

                  {/* 텍스트 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-600">{card.description}</p>
                  </div>

                  {/* 화살표 아이콘 */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              초기 설정 안내
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              이 페이지의 설정들은 시스템 운영 초기에 한 번 설정한 후 거의
              변경할 일이 없는 기본 정보입니다. 신중하게 설정해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterSettingPage;
