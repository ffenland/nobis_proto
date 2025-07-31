// app/member/profile/page.tsx
"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { IMemberProfileData } from "@/app/lib/services/user.service";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

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
      <PageLayout maxWidth="lg">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data?.profile) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            프로필을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href="/member">
            <Button variant="primary">대시보드로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const profile = data.profile;

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
    <PageLayout maxWidth="lg">
      <PageHeader title="내 프로필" />

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
              <Link href="/member/profile/edit">
                <Button variant="outline">프로필 수정</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* 프로필 사진과 기본 정보 */}
            <div className="flex flex-col w-full gap-2">
              {/* 프로필 사진 */}
              <div className="flex-shrink-0 w-full flex justify-center">
                {profile.avatarImage?.cloudflareId ? (
                  <Image
                    src={getOptimizedImageUrl(
                      profile.avatarImage.cloudflareId,
                      "avatarSM"
                    )}
                    alt="프로필 사진"
                    width={120}
                    height={120}
                    className="w-30 h-30 rounded-full object-cover border-4 border-gray-100"
                    priority
                  />
                ) : (
                  <div className="w-30 h-30 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-100">
                    <span className="text-3xl text-gray-400">👤</span>
                  </div>
                )}
              </div>

              {/* 기본 정보 */}
              <div className="flex-1">
                <div className="w-full flex justify-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {profile.username}
                  </h3>
                </div>
                <div className="space-y-2 text-gray-600">
                  <p>
                    <span className="font-medium">이메일:</span> {profile.email}
                  </p>
                  <p>
                    <span className="font-medium">가입일:</span>{" "}
                    {formatDate(profile.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium">가입 유형:</span>{" "}
                    {getSnsProviderText(profile.snsProvider)}
                    {profile.snsProvider && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        SNS 연동
                      </span>
                    )}
                  </p>
                  {profile.canChangeUsername && (
                    <p className="text-sm text-blue-600">
                      사용자명 변경 가능 (남은 횟수:{" "}
                      {2 - profile.usernameChangeCount}회)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 사용자명 변경 이력 */}
        {profile.lastUsernameChangeAt && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>
                  마지막 사용자명 변경:{" "}
                  {formatDate(profile.lastUsernameChangeAt)}
                </p>
                <p className="mt-1">
                  변경 횟수: {profile.usernameChangeCount} / 2회
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
