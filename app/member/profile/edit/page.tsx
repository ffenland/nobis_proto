// app/member/profile/edit/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { IMemberProfileData } from "@/app/lib/services/user.service";
import { getOptimizedImageUrl, validateImageFile } from "@/app/lib/utils/media.utils";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

// 폼 스키마
const profileEditSchema = z.object({
  username: z
    .string()
    .min(2, "사용자명은 최소 2자 이상이어야 합니다.")
    .max(20, "사용자명은 최대 20자까지 가능합니다.")
    .regex(
      /^[a-zA-Z0-9가-힣_-]+$/,
      "사용자명에는 특수문자를 사용할 수 없습니다."
    ),
});

type ProfileEditForm = z.infer<typeof profileEditSchema>;

const fetcher = async (
  url: string
): Promise<{ profile: IMemberProfileData }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }
  return response.json();
};

export default function EditProfilePage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR("/api/member/profile", fetcher);

  const [username, setUsername] = useState("");
  const [isUsernameChanged, setIsUsernameChanged] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentCloudflareImageId, setCurrentCloudflareImageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
  }>({});

  // 에러 모달 상태
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로딩 완료 후 초기값 설정
  useEffect(() => {
    if (data?.profile && !isUsernameChanged) {
      setUsername(data.profile.username);
    }
  }, [data?.profile, isUsernameChanged]);

  // 현재 아바타 이미지 설정
  useEffect(() => {
    if (data?.profile?.avatarImage) {
      setCurrentCloudflareImageId(data.profile.avatarImage.cloudflareId);
    }
  }, [data?.profile]);

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
          <Link href="/member/profile">
            <Button variant="primary">프로필로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const profile = data.profile;

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setIsUsernameChanged(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 검증
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorModalMessage(validation.error || "유효하지 않은 파일입니다.");
      setShowErrorModal(true);
      return;
    }

    setAvatarFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationErrors({});

    try {
      // Form validation
      const validationResult = profileEditSchema.safeParse({ username });
      if (!validationResult.success) {
        const errors: { username?: string } = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0] === 'username') {
            errors.username = err.message;
          }
        });
        setValidationErrors(errors);
        setIsSubmitting(false);
        return;
      }

      let newAvatarImageId: string | null = null;

      // 아바타 파일이 선택된 경우 먼저 업로드
      if (avatarFile) {
        // 1. Cloudflare 업로드 URL 생성
        const uploadUrlResponse = await fetch("/api/media/images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "profile",
            entityId: profile.id,
          }),
        });

        if (!uploadUrlResponse.ok) {
          const error = await uploadUrlResponse.json();
          throw new Error(error.error || "업로드 URL 생성 실패");
        }

        const { uploadURL, customId } = await uploadUrlResponse.json();

        // 2. Cloudflare Images에 직접 업로드
        const formData = new FormData();
        formData.append("file", avatarFile);

        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드 실패");
        }

        // 3. 업로드 확인 및 DB 레코드 생성
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: customId,
            originalName: avatarFile.name,
            mimeType: avatarFile.type,
            size: avatarFile.size,
            type: "PROFILE",
          }),
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          throw new Error(error.error || "이미지 확인 실패");
        }

        const { id: imageId } = await confirmResponse.json();
        newAvatarImageId = imageId;
      }

      // 프로필 업데이트 데이터 준비
      const updateData: any = {};
      
      // 사용자명 변경이 있는 경우
      if (isUsernameChanged && username !== profile.username) {
        updateData.username = username.trim();
      }

      // 아바타 이미지 변경이 있는 경우
      if (newAvatarImageId) {
        updateData.avatarImageId = newAvatarImageId;
      }

      // 변경사항이 있는 경우에만 업데이트
      if (Object.keys(updateData).length > 0) {
        const response = await fetch("/api/member/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "프로필 업데이트에 실패했습니다.");
        }

        // 이전 이미지 삭제 (성공 후에만)
        if (newAvatarImageId && profile.avatarImageId && profile.avatarImageId !== newAvatarImageId) {
          // 비동기로 이전 이미지 삭제 (UI 블로킹 방지)
          fetch(`/api/media/images/${profile.avatarImageId}`, {
            method: "DELETE",
          }).catch(error => {
            console.error("Failed to delete old avatar image:", error);
          });
        }
      }

      // 프로필 데이터 새로고침
      mutate("/api/member/profile");

      // 성공 시 프로필 페이지로 이동
      router.push("/member/profile");
    } catch (error) {
      setErrorModalMessage(
        error instanceof Error
          ? error.message
          : "프로필 업데이트 중 오류가 발생했습니다."
      );
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 현재 표시할 아바타 이미지 URL
  const currentAvatarUrl = avatarPreview || 
    (currentCloudflareImageId ? getOptimizedImageUrl(currentCloudflareImageId, 'avatar') : null);

  const canChangeUsername = profile.canChangeUsername;
  const remainingChanges = 2 - profile.usernameChangeCount;

  return (
    <PageLayout maxWidth="lg">
      <PageHeader title="프로필 수정" />

      <div className="space-y-6">
        {/* 아바타 이미지 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">프로필 사진</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                프로필에 표시될 사진을 업로드하세요. (최대 10MB)
              </p>

              {/* 아바타 미리보기 및 업로드 */}
              <div className="flex items-center space-x-6">
                {/* 아바타 미리보기 */}
                <div className="flex-shrink-0">
                  {currentAvatarUrl ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100">
                      <Image
                        src={currentAvatarUrl}
                        alt="아바타 미리보기"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        unoptimized={currentAvatarUrl.startsWith("data:")}
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-100">
                      <span className="text-4xl text-gray-400">👤</span>
                    </div>
                  )}
                </div>

                {/* 업로드 컨트롤 */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isSubmitting}
                  />

                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {currentCloudflareImageId || avatarPreview ? "사진 변경" : "사진 선택"}
                      </button>

                      {(currentCloudflareImageId || avatarPreview) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {avatarPreview ? "선택 취소" : "제거"}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      JPEG, PNG, WebP 형식, 최대 10MB
                    </p>

                    {avatarFile && (
                      <p className="text-xs text-green-600">
                        새 파일 선택됨: {avatarFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>

              {/* 사용자명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사용자명 *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={!canChangeUsername || isSubmitting}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !canChangeUsername
                      ? "bg-gray-50 text-gray-500 cursor-not-allowed"
                      : "border-gray-300"
                  }`}
                  placeholder="사용자명을 입력하세요"
                />

                {/* 사용자명 검증 메시지 */}
                {validationErrors.username && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.username}
                  </p>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  {canChangeUsername ? (
                    <>
                      <p>2-20자, 영문/한글/숫자/하이픈/언더스코어만 사용 가능</p>
                      <p className="mt-1">변경 가능 횟수: {remainingChanges}회 남음</p>
                      {profile.lastUsernameChangeAt && (
                        <p className="mt-1">
                          마지막 변경: {new Date(profile.lastUsernameChangeAt).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-red-600">
                      사용자명 변경 횟수를 모두 사용했습니다. (최대 2회)
                    </p>
                  )}
                </div>
              </div>

              {/* 가입 유형 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가입 유형
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                  {profile.snsProvider === "naver"
                    ? "네이버"
                    : profile.snsProvider === "kakao"
                    ? "카카오"
                    : "일반"}{" "}
                  계정
                  {profile.snsProvider && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      SNS 연동
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex justify-end space-x-4">
          <Link href="/member/profile">
            <Button variant="outline" disabled={isSubmitting}>
              취소
            </Button>
          </Link>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || (!isUsernameChanged && !avatarFile)}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                저장 중...
              </>
            ) : (
              "저장하기"
            )}
          </Button>
        </div>
      </div>

      {/* 에러 모달 */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">알림</h3>
            <p className="text-gray-700 mb-6">{errorModalMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}