// app/trainer/profile/edit/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import Link from "next/link";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

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
  introduce: z
    .string()
    .max(1000, "자기소개는 최대 1000자까지 가능합니다.")
    .optional(),
});


interface TrainerProfileData {
  id: string;
  userId: string;
  username: string;
  email: string;
  introduce: string | null;
  avatarImageId: string | null;
  avatarImage?: {
    id: string;
    cloudflareId: string;
    originalName: string;
    type: string;
  } | null;
}

export default function TrainerProfileEditPage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<TrainerProfileData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 에러 모달 상태
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // 아바타 관련 상태
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [avatarSrc, setAvatarSrc] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form validation state
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    introduce?: string;
  }>({});

  useEffect(() => {
    // 프로필 데이터 로드
    const loadProfileData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/trainer/profile");

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "프로필 정보를 불러올 수 없습니다.");
        }

        const { data } = await response.json();
        
        // Transform API data to match our interface
        const transformedData: TrainerProfileData = {
          id: data.id,
          userId: data.userId,
          username: data.username,
          email: data.email,
          introduce: data.introduce,
          avatarImageId: data.avatarImageId || null,
          avatarImage: data.avatarImage || null,
        };
        
        setProfileData(transformedData);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, []);

  // 기존 아바타 이미지 초기화
  useEffect(() => {
    if (!profileData) return;
    
    
    // 이미지 URL 설정 (새로운 Image 시스템 우선)
    if (profileData.avatarImageId && profileData.avatarImage) {
      const imageUrl = getOptimizedImageUrl(profileData.avatarImage.cloudflareId, 'avatar');
      setAvatarSrc(imageUrl);
    }
  }, [profileData]);

  // 아바타 파일 업로드 처리
  const handleAvatarUpload = async (fileBlob: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileBlob);

    return new Promise<string>((resolve) => {
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarSrc(result);
        resolve(result);
      };
    });
  };

  // 아바타 파일 선택 처리
  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("이미지 크기는 10MB 이하여야 합니다.");
      return;
    }

    setSelectedAvatarFile(file);
    await handleAvatarUpload(file);
  };

  // 아바타 제거
  const handleAvatarRemove = async () => {
    setSelectedAvatarFile(null);
    
    // Reset to original profile image if exists
    if (profileData) {
      // 이미지 URL 재설정 (원래 이미지로)
      if (profileData.avatarImageId && profileData.avatarImage) {
        const imageUrl = getOptimizedImageUrl(profileData.avatarImage.cloudflareId, 'avatar');
        setAvatarSrc(imageUrl);
      } else {
        setAvatarSrc("");
      }
    } else {
      setAvatarSrc("");
    }
    
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  // 아바타 업로드 버튼 클릭
  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleProfileUpdate = async () => {
    if (!profileData) return;

    // Form validation
    const formData = {
      username: (document.querySelector('input[name="username"]') as HTMLInputElement)?.value || '',
      introduce: (document.querySelector('textarea[name="introduce"]') as HTMLTextAreaElement)?.value || '',
    };

    // Validate form data
    const validationResult = profileEditSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: { username?: string; introduce?: string } = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0] === 'username') {
          errors.username = err.message;
        } else if (err.path[0] === 'introduce') {
          errors.introduce = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      setIsSubmitting(true);
      setError(null);
      const trimmedUsername = formData.username.trim();

      // 사용자명이 변경된 경우 중복 검사
      if (profileData.username !== trimmedUsername) {
        try {
          const checkResponse = await fetch("/api/trainer/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: trimmedUsername }),
          });

          if (checkResponse.ok) {
            const { data: availability } = await checkResponse.json();
            if (!availability.available) {
              // 중복된 경우 모달 표시하고 종료
              setErrorModalMessage("이미 동일한 사용자명이 있습니다");
              setShowErrorModal(true);
              return;
            }
          } else {
            throw new Error("사용자명 중복 검사에 실패했습니다.");
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_checkError) {
          setError("사용자명 중복 검사 중 오류가 발생했습니다.");
          return;
        }
      }

      let newAvatarImageId: string | null = null;
      const previousImageId = profileData.avatarImageId;

      // 새로운 아바타 파일이 선택된 경우 업로드
      if (selectedAvatarFile) {
        try {
          // 1. Cloudflare 업로드 URL 생성
          const uploadUrlResponse = await fetch("/api/media/images/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityType: "profile",
              entityId: profileData.userId,
            }),
          });

          if (!uploadUrlResponse.ok) {
            const error = await uploadUrlResponse.json();
            throw new Error(error.error || "업로드 URL 생성 실패");
          }

          const { uploadURL, customId } = await uploadUrlResponse.json();

          // 2. Cloudflare Images에 직접 업로드
          const formData = new FormData();
          formData.append("file", selectedAvatarFile);

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
              originalName: selectedAvatarFile.name,
              mimeType: selectedAvatarFile.type,
              size: selectedAvatarFile.size,
              type: "PROFILE",
            }),
          });

          if (!confirmResponse.ok) {
            const error = await confirmResponse.json();
            throw new Error(error.error || "이미지 확인 실패");
          }

          const { id: imageId } = await confirmResponse.json();
          newAvatarImageId = imageId;
        } catch (uploadError) {
          throw new Error(
            `아바타 업로드 중 오류 발생: ${
              uploadError instanceof Error
                ? uploadError.message
                : "알 수 없는 오류"
            }`
          );
        }
      }

      // 프로필 업데이트
      const updateData = {
        username: trimmedUsername,
        introduce: formData.introduce || "",
        avatarImageId: newAvatarImageId,
      };

      const response = await fetch("/api/trainer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "프로필 수정에 실패했습니다.");
      }

      // 업로드 성공 후 기존 이미지 삭제
      if (newAvatarImageId && previousImageId && previousImageId !== newAvatarImageId) {
        try {
          // 비동기로 기존 이미지 삭제 (UI 블로킹 방지)
          fetch(`/api/media/images/${previousImageId}`, {
            method: "DELETE",
          }).catch(error => {
            console.error("Failed to delete old avatar image:", error);
          });
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }

      // 성공 시 프로필 페이지로 이동
      router.push("/trainer/profile");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (error && !profileData) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            프로필을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/trainer/profile">
            <Button variant="primary">프로필로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title="프로필 수정" />

      <div className="space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <span className="text-red-400 mr-2">⚠️</span>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* 아바타 이미지 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                프로필 사진
              </h2>
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
                    {avatarSrc ? (
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100">
                        <Image
                          src={avatarSrc}
                          alt="아바타 미리보기"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          unoptimized={avatarSrc.startsWith("data:")} // base64인 경우 최적화 비활성화
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
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
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
                          {avatarSrc && !selectedAvatarFile
                            ? "사진 변경"
                            : "사진 선택"}
                        </button>

                        {(avatarSrc || selectedAvatarFile) && (
                          <button
                            type="button"
                            onClick={handleAvatarRemove}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            제거
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        JPEG, PNG, WebP 형식, 최대 10MB
                      </p>

                      {selectedAvatarFile && (
                        <p className="text-xs text-green-600">
                          새 파일 선택됨: {selectedAvatarFile.name}
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
                    value={profileData?.email || ""}
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
                    name="username"
                    defaultValue={profileData?.username || ""}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    disabled={isSubmitting}
                  />

                  {/* 사용자명 검증 메시지 */}
                  {validationErrors.username && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.username}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    2-20자, 영문/한글/숫자/하이픈/언더스코어만 사용 가능
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 자기소개 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">자기소개</h2>
            </CardHeader>
            <CardContent>
              <div>
                <textarea
                  name="introduce"
                  defaultValue={profileData?.introduce || ""}
                  rows={6}
                  placeholder="자신을 소개해보세요..."
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-gray-300"
                  disabled={isSubmitting}
                />

                {validationErrors.introduce && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.introduce}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  최대 1,000자까지 입력 가능합니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 버튼 */}
          <div className="flex justify-end space-x-4">
            <Link href="/trainer/profile">
              <Button variant="outline" disabled={isSubmitting}>
                취소
              </Button>
            </Link>

            <Button
              variant="primary"
              onClick={handleProfileUpdate}
              disabled={isSubmitting}
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
