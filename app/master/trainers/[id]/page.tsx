"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Users,
  Edit,
  Save,
  X,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import {
  GetTrainerByIdResult,
  GetCentersWithManagerCountResult,
  IAllTrainerLevelsSimple,
} from "@/app/services/master/master-trainer.service";
import { Badge, BadgeVariant } from "@/app/components/ui/Badge";

// 레벨별 컬러 매핑
const getLevelColor = (levelTitle: string): BadgeVariant => {
  const lowerTitle = levelTitle.toLowerCase();

  if (lowerTitle.includes("마스터") || lowerTitle.includes("master"))
    return "purple";
  if (lowerTitle.includes("프로") || lowerTitle.includes("pro"))
    return "indigo";
  if (lowerTitle.includes("시니어") || lowerTitle.includes("senior"))
    return "blue";
  if (lowerTitle.includes("주니어") || lowerTitle.includes("junior"))
    return "green";
  if (lowerTitle.includes("인턴") || lowerTitle.includes("intern"))
    return "gray";

  return "indigo"; // 기본값
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const updateFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update trainer");
  }
  return response.json();
};

type Params = Promise<{ id: string }>;

export default function TrainerDetailPage({ params }: { params: Params }) {
  const router = useRouter();
  const [trainerId, setTrainerId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editCenterId, setEditCenterId] = useState<string>("");
  const [editLevelId, setEditLevelId] = useState<string>("");
  const [editWorkingAt, setEditWorkingAt] = useState<string>("");

  // Manager promotion modal state
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([]);

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
    trainerId ? `/api/master/trainers/${trainerId}` : null,
    fetcher
  );

  // Fetch centers with manager count
  const { data: centers } = useSWR<GetCentersWithManagerCountResult>(
    "/api/master/centers/with-manager-count",
    fetcher
  );

  // Fetch trainer levels
  const { data: levels } = useSWR<IAllTrainerLevelsSimple>(
    "/api/master/trainers/level/simple",
    fetcher
  );

  const { trigger: updateTrainer, isMutating: isUpdating } = useSWRMutation(
    trainerId ? `/api/master/trainers/${trainerId}` : null,
    updateFetcher
  );

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && trainer) {
      setEditCenterId(trainer.fitnessCenter?.id || "");
      setEditLevelId(trainer.level?.id || "");
      setEditWorkingAt(
        trainer.workingAt
          ? new Date(trainer.workingAt).toISOString().split("T")[0]
          : ""
      );
    }
  }, [isEditing, trainer]);

  const handleSave = async () => {
    if (!trainer) return;

    try {
      const body: any = {};

      // Check which fields changed and add to body
      if (editCenterId !== (trainer.fitnessCenter?.id || "")) {
        body.centerId = editCenterId || null;
      }

      if (editLevelId !== (trainer.level?.id || "")) {
        body.levelId = editLevelId || null;
      }

      const originalWorkingAt = trainer.workingAt
        ? new Date(trainer.workingAt).toISOString().split("T")[0]
        : "";
      if (editWorkingAt !== originalWorkingAt) {
        if (editWorkingAt) {
          body.workingAt = editWorkingAt;
        }
      }

      // Only send request if something changed
      if (Object.keys(body).length > 0) {
        await updateTrainer(body);
      }

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
      setEditLevelId(trainer.level?.id || "");
      setEditWorkingAt(
        trainer.workingAt
          ? new Date(trainer.workingAt).toISOString().split("T")[0]
          : ""
      );
    }
  };

  // Manager promotion
  const handlePromoteToManager = () => {
    setSelectedCenterIds([]);
    setShowManagerModal(true);
  };

  const handleConfirmPromotion = async () => {
    if (selectedCenterIds.length === 0) {
      alert("최소 1개 이상의 센터를 선택해야 합니다.");
      return;
    }

    try {
      await updateTrainer({
        promoteManager: true,
        centerIds: selectedCenterIds,
      });
      setShowManagerModal(false);
      mutate();
      alert("매니저로 임명되었습니다.");
    } catch (error) {
      console.error("Failed to promote to manager:", error);
      if (error instanceof Error) {
        alert(`매니저 임명 실패: ${error.message}`);
      } else {
        alert("매니저 임명에 실패했습니다.");
      }
    }
  };

  // Manager demotion
  const handleDemoteManager = async () => {
    if (
      !confirm(
        "매니저 권한을 해임하시겠습니까? 모든 센터 연결이 해제됩니다."
      )
    ) {
      return;
    }

    try {
      await updateTrainer({ demoteManager: true });
      mutate();
      alert("매니저 권한이 해임되었습니다.");
    } catch (error) {
      console.error("Failed to demote manager:", error);
      if (error instanceof Error) {
        alert(`매니저 해임 실패: ${error.message}`);
      } else {
        alert("매니저 해임에 실패했습니다.");
      }
    }
  };

  const toggleCenterSelection = (centerId: string) => {
    setSelectedCenterIds((prev) =>
      prev.includes(centerId)
        ? prev.filter((id) => id !== centerId)
        : [...prev, centerId]
    );
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500">
                        @{trainer.username}
                      </span>
                      {trainer.level ? (
                        <Badge
                          variant={getLevelColor(trainer.level.displayTitle)}
                          size="md"
                        >
                          {trainer.level.displayTitle}
                        </Badge>
                      ) : (
                        <Badge variant="gray" size="md">
                          레벨 없음
                        </Badge>
                      )}
                      {trainer.isManager && (
                        <Badge variant="purple" size="md" icon={ShieldCheck}>
                          매니저
                        </Badge>
                      )}
                      {!trainer.working && (
                        <Badge variant="red" size="md">
                          휴무
                        </Badge>
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

          {/* Manager Management */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">매니저 권한 관리</h3>

              <div className="space-y-4">
                {trainer.isManager ? (
                  <div className="alert alert-info">
                    <ShieldCheck className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">현재 매니저 권한 보유</p>
                      <p className="text-sm mt-1">
                        매니저 권한을 해임하면 모든 센터 연결이 해제됩니다.
                      </p>
                    </div>
                    <button
                      onClick={handleDemoteManager}
                      disabled={isUpdating}
                      className="btn btn-error btn-sm"
                    >
                      <ShieldOff className="w-4 h-4" />
                      매니저 해임
                    </button>
                  </div>
                ) : (
                  <div className="alert">
                    <ShieldOff className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">매니저 권한 없음</p>
                      <p className="text-sm mt-1">
                        트레이너를 매니저로 임명할 수 있습니다.
                      </p>
                    </div>
                    <button
                      onClick={handlePromoteToManager}
                      disabled={isUpdating}
                      className="btn btn-primary btn-sm"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      매니저 임명
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editable Information */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">정보 관리</h3>

              <div className="space-y-4">
                {/* Working Date */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">입사일</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={editWorkingAt}
                      onChange={(e) => setEditWorkingAt(e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {trainer.workingAt ? (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-green-500" />
                          <span>
                            {new Date(trainer.workingAt).toLocaleDateString(
                              "ko-KR"
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span>⚠️ 입사일을 설정해주세요</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Trainer Level */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      트레이너 레벨
                    </span>
                  </label>
                  {isEditing ? (
                    <select
                      className="select select-bordered w-full"
                      value={editLevelId}
                      onChange={(e) => setEditLevelId(e.target.value)}
                    >
                      <option value="">레벨 없음</option>
                      {levels?.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.displayTitle}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {trainer.level ? (
                        <Badge
                          variant={getLevelColor(trainer.level.displayTitle)}
                          size="md"
                        >
                          {trainer.level.displayTitle}
                        </Badge>
                      ) : (
                        <Badge variant="gray" size="md">
                          레벨 없음
                        </Badge>
                      )}
                    </div>
                  )}
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

      {/* Manager Promotion Modal */}
      {showManagerModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              매니저로 임명할 센터 선택
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              최소 1개 이상의 센터를 선택해야 합니다.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {centers?.map((center) => (
                <div
                  key={center.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleCenterSelection(center.id)}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={selectedCenterIds.includes(center.id)}
                    onChange={() => toggleCenterSelection(center.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{center.title}</div>
                    <div className="text-sm text-gray-500">
                      현재 매니저: {center.managerCount}명
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowManagerModal(false)}
                className="btn btn-ghost"
              >
                취소
              </button>
              <button
                onClick={handleConfirmPromotion}
                disabled={selectedCenterIds.length === 0 || isUpdating}
                className="btn btn-primary"
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "임명하기"
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowManagerModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
