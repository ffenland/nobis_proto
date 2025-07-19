// app/member/profile/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { IMemberProfileData } from "@/app/lib/services/user.service";

const fetcher = async (
  url: string
): Promise<{ profile: IMemberProfileData }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }
  return response.json();
};

export default function MemberProfilePage() {
  const { data, error, isLoading } = useSWR("/api/member/profile", fetcher);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">프로필을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">프로필을 불러올 수 없습니다.</div>
      </div>
    );
  }

  const profile = data?.profile;

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">프로필 정보가 없습니다.</div>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSnsProviderText = (provider: string | null) => {
    switch (provider) {
      case "naver":
        return "네이버";
      case "kakao":
        return "카카오";
      default:
        return "일반";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필</h1>
          <p className="text-gray-600">
            회원님의 프로필 정보를 확인하고 수정할 수 있습니다.
          </p>
        </div>

        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
              <Link
                href="/member/profile/edit"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
              >
                수정하기
              </Link>
            </div>

            <div className="flex items-start space-x-6">
              {/* 아바타 */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                  <Image
                    src={
                      profile.avatarMedia?.publicUrl ||
                      "/images/default_profile.jpg"
                    }
                    alt="프로필 사진"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 정보 */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자명
                  </label>
                  <div className="text-gray-900">{profile.username}</div>
                  {profile.canChangeUsername && (
                    <div className="text-xs text-gray-500 mt-1">
                      변경 가능 횟수: {2 - profile.usernameChangeCount}회 남음
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <div className="text-gray-900">{profile.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가입 유형
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900">
                      {getSnsProviderText(profile.snsProvider)}
                    </span>
                    {profile.snsProvider && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        SNS 연동
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 멤버십 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              멤버십 정보
            </h2>

            {profile.membership.isActive ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">이용권</span>
                  <span className="font-medium text-gray-900">
                    {profile.membership.productTitle || "기본 이용권"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">남은 기간</span>
                  <span
                    className={`font-medium ${
                      profile.membership.daysRemaining <= 7
                        ? "text-red-600"
                        : profile.membership.daysRemaining <= 30
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                  >
                    {profile.membership.daysRemaining}일 남음
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">만료일</span>
                  <span className="text-gray-900">
                    {formatDate(profile.membership.expiryDate)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-500 mb-2">
                  활성화된 멤버십이 없습니다.
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  멤버십 구매하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PT 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              PT 정보
            </h2>

            {profile.pt.isActive ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">수업 종류</span>
                  <span className="font-medium text-gray-900">
                    {profile.pt.productTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">담당 트레이너</span>
                  <span className="text-gray-900">
                    {profile.pt.trainerName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">수업 진행 상황</span>
                  <span className="font-medium text-blue-600">
                    총 {profile.pt.totalSessions}회 수업 중{" "}
                    {profile.pt.remainingSessions}회 남음
                  </span>
                </div>
                <div className="mt-4">
                  <Link
                    href="/member/pt"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    PT 상세 정보 보기 →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-500 mb-2">
                  진행 중인 PT가 없습니다.
                </div>
                <Link href={"/member/pt/new"}>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    PT 신청하기
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 가입일 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {formatDate(profile.createdAt)}에 가입하셨습니다.
        </div>
      </div>
    </div>
  );
}
