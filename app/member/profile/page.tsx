"use client";

import { useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useForm } from "react-hook-form";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Edit,
  Save,
  X,
  Clock,
  Users,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { GetMemberProfileResult } from "@/app/services/member/profile.service";
import { mutate as globalMutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const updateFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "업데이트에 실패했습니다.");
  }
  return response.json();
};

interface ProfileFormData {
  username: string;
  mobile: string;
}

const MemberProfile = () => {
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR<GetMemberProfileResult>("/api/member/profile", fetcher);

  const { trigger: updateProfile, isMutating: isUpdating } = useSWRMutation(
    "/api/member/profile",
    updateFetcher
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      mutate();
      // GlobalHeader의 세션 정보도 업데이트
      globalMutate("/api/auth/session");
      alert("프로필이 성공적으로 업데이트되었습니다.");
    } catch (error) {
      console.error("Failed to update profile:", error);
      if (error instanceof Error) {
        alert(`업데이트 실패: ${error.message}`);
      } else {
        alert("프로필 업데이트에 실패했습니다.");
      }
    }
  };

  const handleEditClick = () => {
    if (profile) {
      reset({
        username: profile.username || "",
        mobile: profile.mobile || "",
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">
            프로필 정보를 불러올 수 없습니다
          </p>
          <Button onClick={() => mutate()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 프로필</h1>
            <p className="text-gray-600 text-sm mt-1">개인정보 및 PT 현황</p>
          </div>

          {/* Edit Toggle */}
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isUpdating}
                size="sm"
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                저장
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
                취소
              </Button>
            </div>
          ) : (
            <Button onClick={handleEditClick} size="sm">
              <Edit className="w-4 h-4 mr-2" />
              편집
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 flex-shrink-0">
                {profile.avatarImageId ? (
                  <img
                    src={`https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${profile.avatarImageId}/avatar`}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-600">
                      {profile.username[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{profile.username}</h2>
                  {!profile.memberProfile.active && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      비활성
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{profile.mobile}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>가입일: {new Date(profile.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">개인정보 수정</h3>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자명
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.username ? "border-red-500" : "border-gray-300"
                    }`}
                    {...register("username", {
                      required: "사용자명을 입력해주세요",
                      minLength: {
                        value: 2,
                        message: "사용자명은 최소 2자 이상이어야 합니다",
                      },
                    })}
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.username.message}
                    </p>
                  )}
                  {profile.usernameChangeCount > 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      변경 횟수: {profile.usernameChangeCount}/2
                    </p>
                  )}
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휴대폰 번호
                  </label>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.mobile ? "border-red-500" : "border-gray-300"
                    }`}
                    {...register("mobile", {
                      pattern: {
                        value: /^[0-9]{10,11}$/,
                        message: "휴대폰 번호는 10-11자리 숫자만 입력 가능합니다",
                      },
                    })}
                  />
                  {errors.mobile && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.mobile.message}
                    </p>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자명
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {profile.username}
                  </div>
                  {profile.usernameChangeCount > 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      변경 횟수: {profile.usernameChangeCount}/2
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휴대폰 번호
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {profile.mobile || (
                      <span className="text-gray-500">등록되지 않음</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fitness Center */}
        {profile.memberProfile.fitnessCenter && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">소속 피트니스 센터</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium">
                    {profile.memberProfile.fitnessCenter.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile.memberProfile.fitnessCenter.address}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PT Summary */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">PT 현황</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">활성 PT</div>
                <div className="text-2xl font-bold text-blue-600">
                  {profile.memberProfile.confirmedPts.length}
                </div>
                <div className="text-xs text-gray-500">진행 중인 PT</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent PT */}
        {profile.memberProfile.confirmedPts.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">최근 PT</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.memberProfile.confirmedPts.map((pt) => (
                  <div key={pt.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{pt.ptProduct.title}</h4>
                      <span className="text-sm text-gray-500">
                        {pt.completedLessons}/{pt.totalLessons}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {pt.trainer?.user.username || "존재하지 않는 트레이너 입니다."}
                    </div>

                    {pt.recentLesson && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        최근 수업:{" "}
                        {new Date(pt.recentLesson.scheduledAt).toLocaleDateString("ko-KR")}
                      </div>
                    )}

                    {pt.goals && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Target className="w-4 h-4 mt-0.5" />
                        <span>{pt.goals}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(pt.completedLessons / pt.totalLessons) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;