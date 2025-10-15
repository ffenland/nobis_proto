"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Users,
  Edit,
  Save,
  X,
} from "lucide-react";
import { GetTrainerByIdResult } from "@/app/services/manager/manager-trainer.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const updateFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!response.ok) {
    throw new Error("Failed to update trainer");
  }
  return response.json();
};

type Params = Promise<{ id: string }>;

export default function TrainerDetailPage({ params }: { params: Params }) {
  const router = useRouter();
  const [trainerId, setTrainerId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editCenterId, setEditCenterId] = useState<string>("");

  // Get params
  useEffect(() => {
    params.then((p) => {
      setTrainerId(p.id);
    });
  }, [params]);

  const {
    data: trainer,
    error,
    isLoading,
    mutate,
  } = useSWR<GetTrainerByIdResult>(
    trainerId ? `/api/manager/trainers/${trainerId}` : null,
    fetcher
  );

  const { trigger: updateTrainer, isMutating: isUpdating } = useSWRMutation(
    trainerId ? `/api/manager/trainers/${trainerId}` : null,
    updateFetcher
  );

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && trainer) {
      setEditCenterId(trainer.fitnessCenter?.id || "");
    }
  }, [isEditing, trainer]);

  const handleSave = async () => {
    if (!trainer) return;

    try {
      await updateTrainer({
        fitnessCenterId: editCenterId || null,
      });

      setIsEditing(false);
      mutate(); // Refresh data
      alert("트레이너 정보가 성공적으로 업데이트되었습니다.");
    } catch (error) {
      console.error("Failed to update trainer:", error);
      if (error instanceof Error) {
        alert(`업데이트 실패: ${error.message}`);
      } else {
        alert("업데이트에 실패했습니다.");
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (trainer) {
      setEditCenterId(trainer.fitnessCenter?.id || "");
    }
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-2">
              트레이너 정보를 불러올 수 없습니다
            </p>
            <button onClick={() => router.back()} className="btn btn-primary">
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!trainer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-amber-500 text-lg mb-2">
              트레이너 정보를 불러오는 중입니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-gray-600 mt-1">트레이너 상세 정보</p>
          </div>
        </div>

        {/* Edit Toggle */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
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
              onClick={() => setIsEditing(true)}
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
                    <span className="text-2xl font-bold">
                      {trainer.realname?.[0] || trainer.username[0]}
                    </span>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <div className="mb-3">
                    <h2 className="text-2xl font-bold mb-1">
                      {trainer.realname || "실명 미등록"}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        @{trainer.username}
                      </span>
                      {trainer.level ? (
                        <span className="badge badge-info">
                          {trainer.level.displayTitle}
                        </span>
                      ) : (
                        <span className="badge badge-ghost">레벨 없음</span>
                      )}
                      {!trainer.working && (
                        <span className="badge badge-error">휴무</span>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    {trainer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {trainer.email}
                      </div>
                    )}
                    {trainer.mobile && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {trainer.mobile}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      가입일:{" "}
                      {new Date(trainer.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Information */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">정보 관리</h3>

              <div className="space-y-4">
                {/* Trainer Level - Read Only */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      트레이너 레벨
                    </span>
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    {trainer.level ? (
                      <span className="badge badge-info">
                        {trainer.level.displayTitle}
                      </span>
                    ) : (
                      <span className="badge badge-ghost">레벨 없음</span>
                    )}
                    <Link
                      href="/manager/trainers/level"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      레벨 관리 페이지에서 수정
                    </Link>
                  </div>
                </div>

                {/* Fitness Center */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      소속 피트니스 센터
                    </span>
                  </label>
                  {isEditing ? (
                    <select
                      className="select select-bordered w-full"
                      value={editCenterId}
                      onChange={(e) => setEditCenterId(e.target.value)}
                    >
                      <option value="">미소속</option>
                      {trainer.centerList.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {trainer.fitnessCenter ? (
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium">
                              {trainer.fitnessCenter.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {trainer.fitnessCenter.address}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Building className="w-4 h-4" />
                          <span>소속 없음</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Introduction */}
          {trainer.introduce && trainer.introduce !== "안녕하세요" && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">소개</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {trainer.introduce}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          {/* PT Statistics */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">PT 통계</h3>

              <div className="space-y-4">
                <div className="stat p-4 bg-primary/10 rounded-lg">
                  <div className="stat-figure text-primary">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="stat-title text-sm">활성 PT</div>
                  <div className="stat-value text-primary text-2xl">
                    {trainer.stats.activePt}
                  </div>
                  <div className="stat-desc">진행 중인 PT</div>
                </div>

                <div className="stat p-4 bg-info/10 rounded-lg">
                  <div className="stat-figure text-info">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <div className="stat-title text-sm">이번 달 수업</div>
                  <div className="stat-value text-info text-2xl">
                    {trainer.stats.thisMonthLessons}
                  </div>
                  <div className="stat-desc">
                    {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
                  </div>
                </div>

                <div className="stat p-4 bg-gray-100 rounded-lg">
                  <div className="stat-figure text-gray-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="stat-title text-sm">총 PT</div>
                  <div className="stat-value text-gray-600 text-2xl">
                    {trainer.stats.totalPt}
                  </div>
                  <div className="stat-desc">전체 PT 수</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
