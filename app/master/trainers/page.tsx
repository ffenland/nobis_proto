"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { User, Phone, Award, ShieldCheck, Calendar, Clock } from "lucide-react";
import { GetAllTrainersResult } from "@/app/services/master/master-trainer.service";
import { IAllCenters } from "@/app/services/master/dashboard.service";
import { Badge, BadgeVariant } from "@/app/components/ui/Badge";
import { formatMobile } from "@/app/lib/utils/format.utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 레벨별 컬러 매핑
const getLevelColor = (levelTitle: string): BadgeVariant => {
  const lowerTitle = levelTitle.toLowerCase();

  if (lowerTitle.includes("마스터") || lowerTitle.includes("master"))
    return "purple";
  if (lowerTitle.includes("엑스퍼트") || lowerTitle.includes("expert"))
    return "indigo";
  if (lowerTitle.includes("시니어") || lowerTitle.includes("senior"))
    return "blue";
  if (lowerTitle.includes("주니어") || lowerTitle.includes("junior"))
    return "green";
  if (lowerTitle.includes("인턴") || lowerTitle.includes("intern"))
    return "gray";

  return "indigo"; // 기본값
};

export default function TrainersPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<string>("ALL");

  const {
    data: trainersByCenter,
    error,
    isLoading,
  } = useSWR<GetAllTrainersResult>("/api/master/trainers", fetcher);

  const { data: allCenters } = useSWR<IAllCenters>(
    "/api/master/dashboard/centers",
    fetcher
  );

  // 선택된 센터의 트레이너 목록
  const selectedCenterData = useMemo(() => {
    if (!trainersByCenter) return null;

    if (selectedCenterId === "ALL") {
      // 모든 센터의 트레이너를 하나의 배열로 합침
      const allTrainers = Object.entries(trainersByCenter).flatMap(
        ([centerId, data]) =>
          data.trainers.map((trainer) => ({
            ...trainer,
            centerId,
            centerTitle: data.centerTitle,
          }))
      );
      return {
        centerTitle: "모든 센터",
        trainers: allTrainers,
      };
    }

    return trainersByCenter[selectedCenterId] || null;
  }, [trainersByCenter, selectedCenterId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">
            데이터를 불러올 수 없습니다
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">트레이너 관리</h1>
        <p className="text-gray-600">
          전체 {selectedCenterData?.trainers.length || 0}명의 트레이너
        </p>
      </div>

      {/* 센터 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          피트니스 센터
        </label>
        <select
          className="select select-bordered w-full max-w-xs"
          value={selectedCenterId}
          onChange={(e) => setSelectedCenterId(e.target.value)}
        >
          <option value="ALL">모든 센터</option>
          {allCenters?.centers.map((center) => (
            <option key={center.id} value={center.id}>
              {center.title}
            </option>
          ))}
        </select>
      </div>

      {/* 트레이너 목록 */}
      {selectedCenterData && selectedCenterData.trainers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedCenterData.trainers.map((trainer) => (
            <Link
              key={trainer.id}
              href={`/master/trainers/${trainer.id}`}
              className="card bg-white shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
            >
              <div className="card-body">
                {/* 헤더: 이름과 레벨 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="avatar placeholder">
                      <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-lg font-bold">
                          {trainer.realname?.[0] || trainer.username[0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">
                        {trainer.realname || trainer.username}
                      </h3>
                      <p className="text-sm text-gray-500">
                        @{trainer.username}
                      </p>
                    </div>
                  </div>

                  {/* 매니저 뱃지 */}
                  {trainer.isManager && (
                    <Badge variant="amber" size="lg" icon={ShieldCheck}>
                      매니저
                    </Badge>
                  )}
                </div>

                {/* 레벨 정보 */}
                {trainer.level && (
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-gray-400" />
                    <Badge
                      variant={getLevelColor(trainer.level.displayTitle)}
                      size="md"
                    >
                      {trainer.level.displayTitle}
                    </Badge>
                  </div>
                )}

                {/* 연락처 */}
                {trainer.mobile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Phone className="w-4 h-4" />
                    {formatMobile(trainer.mobile)}
                  </div>
                )}

                {/* 센터 정보 (모든 센터 보기일 때만 표시) */}
                {selectedCenterId === "ALL" && "centerTitle" in trainer && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">소속:</span>{" "}
                    {String((trainer as any).centerTitle)}
                  </div>
                )}

                {/* 통계 */}
                <div className="divider my-2"></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {trainer.stats.activePtCount}
                    </div>
                    <div className="text-xs text-gray-600">진행중 PT</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-green-600" />
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {trainer.stats.thisMonthLessonsCount}
                    </div>
                    <div className="text-xs text-gray-600">이번달 레슨</div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {trainer.stats.scheduledLessonsCount}
                    </div>
                    <div className="text-xs text-gray-600">예약된 레슨</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              등록된 트레이너가 없습니다
            </h2>
            <p className="text-gray-500">
              {selectedCenterId === "ALL"
                ? "트레이너를 등록해 주세요."
                : "이 센터에 등록된 트레이너가 없습니다."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
