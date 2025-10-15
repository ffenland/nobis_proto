"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  User,
  Building,
  Phone,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Award,
  UserX,
} from "lucide-react";
import { TrainerListItem } from "@/app/services/manager/manager-trainer.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TrainersPage() {
  const [selectedCenter, setSelectedCenter] = useState<string>("");

  const {
    data: trainers,
    error,
    isLoading,
  } = useSWR<TrainerListItem[]>("/api/manager/trainers", fetcher);

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
      </div>
    );
  }

  // 피트니스 센터별로 그룹화
  const centerOptions = Array.from(
    new Set(
      trainers
        ?.filter((trainer) => trainer.fitnessCenter)
        .map((trainer) =>
          JSON.stringify({
            id: trainer.fitnessCenter!.id,
            title: trainer.fitnessCenter!.title,
          })
        )
    )
  ).map((centerStr) => JSON.parse(centerStr));

  // 필터링된 트레이너
  const filteredTrainers =
    trainers?.filter((trainer) => {
      if (!selectedCenter) return true;
      if (selectedCenter === "NO_CENTER") {
        return !trainer.fitnessCenter;
      }
      return trainer.fitnessCenter?.id === selectedCenter;
    }) || [];

  // 통계 계산
  const stats = {
    total: trainers?.length || 0,
    working: trainers?.filter((t) => t.working).length || 0,
    withCenter: trainers?.filter((t) => t.fitnessCenter).length || 0,
    withoutCenter: trainers?.filter((t) => !t.fitnessCenter).length || 0,
  };

  return (
    <div className="h-full flex flex-col mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">트레이너 관리</h1>
            <p className="text-gray-600 mt-1">
              활성 트레이너 {stats.working}명
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:justify-end gap-2 md:gap-3">
          <Link
            href="/manager/trainers/off"
            className="btn  md:btn-md btn-warning"
          >
            <UserX className="w-4 h-4" />
            <span className="ml-1">휴무 관리</span>
          </Link>
          <Link
            href="/manager/trainers/level"
            className="btn  md:btn-md btn-info"
          >
            <Award className="w-4 h-4" />
            <span className="ml-1">레벨 관리</span>
          </Link>
          <Link
            href="/manager/trainers/new"
            className="btn  md:btn-md btn-primary col-span-2 md:col-span-1"
          >
            <User className="w-4 h-4" />
            <span className="ml-2">신규 트레이너 등록</span>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">전체 트레이너</p>
              <p className="text-3xl font-bold text-primary">{stats.working}</p>
            </div>
            <Users className="w-8 h-8 text-primary flex-shrink-0" />
          </div>
        </div>

        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">센터 소속</p>
              <p className="text-3xl font-bold text-info">{stats.withCenter}</p>
            </div>
            <Building className="w-8 h-8 text-info flex-shrink-0" />
          </div>
        </div>

        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">소속 없음</p>
              <p className="text-3xl font-bold text-warning">{stats.withoutCenter}</p>
            </div>
            <XCircle className="w-8 h-8 text-warning flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="form-control">
            <label className="label">
              <span className="label-text">피트니스 센터</span>
            </label>
            <select
              className="select select-bordered w-full max-w-xs"
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
            >
              <option value="">전체 센터</option>
              {centerOptions.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.title}
                </option>
              ))}
              <option value="NO_CENTER">소속 없음</option>
            </select>
          </div>

          {selectedCenter && (
            <div className="mt-8">
              <button
                onClick={() => setSelectedCenter("")}
                className="btn btn-ghost btn-sm"
              >
                필터 초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 트레이너 목록 */}
      {filteredTrainers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrainers.map((trainer) => (
            <Link
              key={trainer.id}
              href={`/manager/trainers/${trainer.id}`}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
            >
              <div className="card-body">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                        <span className="text-lg font-medium">
                          {trainer.realname?.[0] || trainer.username[0]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">
                        {trainer.realname || "실명 미등록"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          @{trainer.username}
                        </span>
                        {trainer.level ? (
                          <span className="badge badge-sm badge-info">
                            {trainer.level.displayTitle}
                          </span>
                        ) : (
                          <span className="badge badge-sm badge-ghost">
                            레벨 없음
                          </span>
                        )}
                        {!trainer.working && (
                          <span className="badge badge-error badge-sm">
                            휴무
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-2 mt-4">
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
                </div>

                {/* 소속 센터 */}
                <div className="mt-4">
                  {trainer.fitnessCenter ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">
                        {trainer.fitnessCenter.title}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building className="w-4 h-4" />
                      <span>소속 없음</span>
                    </div>
                  )}
                </div>

                {/* PT 통계 */}
                <div className="divider my-4"></div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">
                      {trainer.stats.totalPt}
                    </div>
                    <div className="text-xs text-gray-500">총 PT</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-success">
                      {trainer.stats.activePt}
                    </div>
                    <div className="text-xs text-gray-500">진행중</div>
                  </div>
                </div>

                {/* 최근 수업 */}
                {trainer.recentLesson && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 mb-1">최근 수업</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(
                        trainer.recentLesson.scheduledAt
                      ).toLocaleDateString("ko-KR")}
                      {trainer.recentLesson.hasRecords && (
                        <span className="badge badge-success badge-xs">
                          완료
                        </span>
                      )}
                      {trainer.recentLesson.isCanceled && (
                        <span className="badge badge-error badge-xs">취소</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 소개 */}
                {trainer.introduce && trainer.introduce !== "안녕하세요" && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {trainer.introduce}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              {selectedCenter
                ? "해당 센터에 등록된 트레이너가 없습니다"
                : "등록된 트레이너가 없습니다"}
            </h2>
            <p className="text-gray-500">
              {selectedCenter
                ? "다른 센터를 선택하거나 필터를 초기화해 보세요."
                : "트레이너를 등록해 주세요."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
