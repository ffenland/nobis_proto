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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-2">
              프로필 정보를 불러올 수 없습니다
            </p>
            <button onClick={() => mutate()} className="btn btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">내 프로필</h1>
          <p className="text-gray-600 mt-1">개인정보 및 PT 현황</p>
        </div>

        {/* Edit Toggle */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isUpdating}
                className="btn btn-primary btn-sm"
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                저장
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="btn btn-ghost btn-sm"
              >
                <X className="w-4 h-4" />
                취소
              </button>
            </>
          ) : (
            <button
              onClick={handleEditClick}
              className="btn btn-primary btn-sm"
            >
              <Edit className="w-4 h-4" />
              편집
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile & Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="avatar placeholder">
                  <div className="bg-neutral-focus text-neutral-content rounded-full w-20 h-20">
                    {profile.avatarImageId ? (
                      <img
                        src={`https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${profile.avatarImageId}/avatar`}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold">
                        {profile.username[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl font-bold">{profile.username}</h2>
                    {!profile.memberProfile.active && (
                      <span className="badge badge-error">비활성</span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </div>
                    {profile.mobile && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {profile.mobile}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      가입일:{" "}
                      {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Information */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">개인정보 수정</h3>

              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">사용자명</span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered w-full ${
                        errors.username ? "input-error" : ""
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
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.username.message}
                        </span>
                      </label>
                    )}
                    {profile.usernameChangeCount > 0 && (
                      <label className="label">
                        <span className="label-text-alt text-gray-500">
                          변경 횟수: {profile.usernameChangeCount}/2
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        휴대폰 번호
                      </span>
                    </label>
                    <input
                      type="tel"
                      placeholder="01012345678"
                      className={`input input-bordered w-full ${
                        errors.mobile ? "input-error" : ""
                      }`}
                      {...register("mobile", {
                        pattern: {
                          value: /^[0-9]{10,11}$/,
                          message:
                            "휴대폰 번호는 10-11자리 숫자만 입력 가능합니다",
                        },
                      })}
                    />
                    {errors.mobile && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.mobile.message}
                        </span>
                      </label>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">사용자명</span>
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {profile.username}
                    </div>
                    {profile.usernameChangeCount > 0 && (
                      <label className="label">
                        <span className="label-text-alt text-gray-500">
                          변경 횟수: {profile.usernameChangeCount}/2
                        </span>
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text font-medium">
                        휴대폰 번호
                      </span>
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {profile.mobile || (
                        <span className="text-gray-500">등록되지 않음</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fitness Center */}
          {profile.memberProfile.fitnessCenter && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">소속 피트니스 센터</h3>
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
              </div>
            </div>
          )}
        </div>

        {/* PT Information */}
        <div className="space-y-6">
          {/* PT Summary */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">PT 현황</h3>

              <div className="stat p-4 bg-primary/10 rounded-lg">
                <div className="stat-figure text-primary">
                  <Users className="w-8 h-8" />
                </div>
                <div className="stat-title text-sm">활성 PT</div>
                <div className="stat-value text-primary text-2xl">
                  {profile.memberProfile.confirmedPts.length}
                </div>
                <div className="stat-desc">진행 중인 PT</div>
              </div>
            </div>
          </div>

          {/* Recent PT */}
          {profile.memberProfile.confirmedPts.length > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">최근 PT</h3>

                {profile.memberProfile.confirmedPts.map((pt) => (
                  <div key={pt.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{pt.ptProduct.title}</h4>
                      <span className="text-sm text-gray-500">
                        {pt.completedLessons}/{pt.totalLessons}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {pt.trainer?.user.username || "알 수 없음."}
                    </div>

                    {pt.recentLesson && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        최근 수업:{" "}
                        {new Date(
                          pt.recentLesson.scheduledAt
                        ).toLocaleDateString("ko-KR")}
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
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            (pt.completedLessons / pt.totalLessons) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
