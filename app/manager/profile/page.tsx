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
} from "lucide-react";
import { GetManagerProfileResult } from "@/app/services/manager/profile.service";
import { mutate as globalMutate } from "swr";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";

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

const ManagerProfile = () => {
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR<GetManagerProfileResult>("/api/manager/profile", fetcher);

  const { trigger: updateProfile, isMutating: isUpdating } = useSWRMutation(
    "/api/manager/profile",
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
    <div className="h-full container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">내 프로필</h1>
          <p className="text-gray-600 mt-1">개인정보 및 센터 정보</p>
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
            <button onClick={handleEditClick} className="btn btn-primary btn-sm">
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
                      <ProfileImagePreview
                        imageId={profile.avatarImageId}
                        variant="avatar"
                        size="lg"
                        fallback={
                          <span className="text-2xl font-bold">
                            {profile.username[0]}
                          </span>
                        }
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
                    <span className="badge badge-primary">매니저</span>
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
                      <span className="label-text font-medium">휴대폰 번호</span>
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
                          message: "휴대폰 번호는 10-11자리 숫자만 입력 가능합니다",
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
                      <span className="label-text font-medium">휴대폰 번호</span>
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
        </div>

        {/* Fitness Center Information */}
        <div className="space-y-6">
          {/* Fitness Centers */}
          {profile.managerProfile.fitnessCenter && profile.managerProfile.fitnessCenter.length > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">관리 센터</h3>
                <div className="space-y-4">
                  {profile.managerProfile.fitnessCenter.map((center) => (
                    <div key={center.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">{center.title}</div>
                          <div className="text-sm text-gray-500">
                            {center.address}
                          </div>
                        </div>
                      </div>
                      {center.description && (
                        <div className="text-sm text-gray-600 mt-2">
                          {center.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manager Info */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">매니저 정보</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">관리자</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    매니저 등록일:{" "}
                    {new Date(profile.managerProfile.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerProfile;