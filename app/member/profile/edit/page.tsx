// app/member/profile/edit/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import Image from "next/image";
import Link from "next/link";
import { MemberProfileData } from "@/app/lib/services/user.service";

const fetcher = async (
  url: string
): Promise<{ profile: MemberProfileData }> => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로딩 완료 후 초기값 설정
  useEffect(() => {
    if (data?.profile && !isUsernameChanged) {
      setUsername(data.profile.username);
    }
  }, [data?.profile, isUsernameChanged]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">프로필을 불러오는 중...</div>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">프로필을 불러올 수 없습니다.</div>
      </div>
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

    // 파일 크기 확인 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "파일 크기는 10MB를 초과할 수 없습니다.",
      });
      return;
    }

    // 파일 타입 확인
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "이미지 파일만 업로드 가능합니다." });
      return;
    }

    setAvatarFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setMessage(null);
  };

  const handleRemoveAvatar = async () => {
    try {
      const response = await fetch("/api/member/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("아바타 제거에 실패했습니다.");
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      setMessage({ type: "success", text: "아바타가 제거되었습니다." });

      // 프로필 데이터 새로고침
      mutate("/api/member/profile");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "아바타 제거 중 오류가 발생했습니다.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      let avatarMediaId = profile.avatarMedia?.id || null;

      // 아바타 파일이 선택된 경우 먼저 업로드
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("type", "PROFILE");

        const uploadResponse = await fetch("/api/media/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "이미지 업로드에 실패했습니다.");
        }

        const uploadResult = await uploadResponse.json();
        avatarMediaId = uploadResult.media.id;

        // 아바타로 설정
        const avatarResponse = await fetch("/api/member/profile/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: avatarMediaId }),
        });

        if (!avatarResponse.ok) {
          throw new Error("아바타 설정에 실패했습니다.");
        }
      }

      // 사용자명 변경이 있는 경우
      if (isUsernameChanged && username !== profile.username) {
        const usernameResponse = await fetch("/api/member/profile/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });

        if (!usernameResponse.ok) {
          const errorData = await usernameResponse.json();
          throw new Error(errorData.error || "사용자명 변경에 실패했습니다.");
        }
      }

      setMessage({
        type: "success",
        text: "프로필이 성공적으로 업데이트되었습니다.",
      });

      // 프로필 데이터 새로고침
      mutate("/api/member/profile");

      // 2초 후 프로필 페이지로 이동
      setTimeout(() => {
        router.push("/member/profile");
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "프로필 업데이트 중 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAvatarUrl =
    avatarPreview ||
    profile.avatarMedia?.publicUrl ||
    "/images/default_profile.jpg";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/member/profile"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 뒤로가기
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필 수정</h1>
          <p className="text-gray-600">
            사용자명과 프로필 사진을 변경할 수 있습니다.
          </p>
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 수정 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 space-y-6">
            {/* 아바타 섹션 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                프로필 사진
              </label>

              <div className="flex items-start space-x-6">
                {/* 현재 아바타 */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                    <Image
                      src={currentAvatarUrl}
                      alt="프로필 사진"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* 아바타 컨트롤 */}
                <div className="flex-1 space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      사진 선택
                    </button>
                  </div>

                  {(profile.avatarMedia || avatarPreview) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      사진 제거
                    </button>
                  )}

                  <div className="text-xs text-gray-500">
                    JPG, PNG, WEBP 파일 (최대 10MB)
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자명 섹션 */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                사용자명
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                disabled={!profile.canChangeUsername}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !profile.canChangeUsername
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-white"
                }`}
                placeholder="사용자명을 입력하세요"
                minLength={2}
                maxLength={20}
              />
              <div className="mt-2 text-xs text-gray-500">
                {profile.canChangeUsername ? (
                  <>
                    변경 가능 횟수: {2 - profile.usernameChangeCount}회 남음
                    {profile.lastUsernameChangeAt && (
                      <div className="mt-1">
                        마지막 변경:{" "}
                        {new Date(
                          profile.lastUsernameChangeAt
                        ).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </>
                ) : (
                  "사용자명 변경 횟수를 모두 사용했습니다. (최대 2회)"
                )}
              </div>
            </div>

            {/* 읽기 전용 정보 */}
            <div className="border-t pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-gray-600">
                  {profile.email}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  이메일은 변경할 수 없습니다.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가입 유형
                </label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-gray-600">
                  {profile.snsProvider === "naver"
                    ? "네이버"
                    : profile.snsProvider === "kakao"
                    ? "카카오"
                    : "일반"}{" "}
                  계정
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <Link
              href="/member/profile"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || (!isUsernameChanged && !avatarFile)}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isSubmitting || (!isUsernameChanged && !avatarFile)
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {isSubmitting ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
