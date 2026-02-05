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
  Clock,
  XCircle,
  CreditCard,
  UserCheck,
  UserX,
} from "lucide-react";
import { MemberListItem } from "@/app/services/master/master-member.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MembersPage() {
  const [selectedCenter, setSelectedCenter] = useState<string>("");

  const {
    data: members,
    error,
    isLoading,
  } = useSWR<MemberListItem[]>("/api/manager/members", fetcher);

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
      members
        ?.filter((member) => member.fitnessCenter)
        .map((member) =>
          JSON.stringify({
            id: member.fitnessCenter!.id,
            title: member.fitnessCenter!.title,
          })
        )
    )
  ).map((centerStr) => JSON.parse(centerStr));

  // 필터링된 회원 목록
  const filteredMembers = selectedCenter
    ? members?.filter((member) => member.fitnessCenter?.id === selectedCenter)
    : members;

  // 전체 통계
  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter((member) => member.active).length || 0;
  const activeMemberships =
    members?.filter((member) => member.membership?.isActive).length || 0;
  const activePTs =
    members?.reduce((sum, member) => sum + member.stats.activePt, 0) || 0;

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">회원 관리</h1>
          <p className="text-gray-600">전체 회원 목록을 관리합니다</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">전체 회원</p>
              <p className="text-3xl font-bold text-primary">{totalMembers}</p>
              <p className="text-xs text-gray-400 mt-1">등록된 총 회원 수</p>
            </div>
            <Users className="w-8 h-8 text-primary flex-shrink-0" />
          </div>
        </div>

        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">활성 회원</p>
              <p className="text-3xl font-bold text-success">{activeMembers}</p>
              <p className="text-xs text-gray-400 mt-1">현재 활동 중인 회원</p>
            </div>
            <UserCheck className="w-8 h-8 text-success flex-shrink-0" />
          </div>
        </div>

        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">활성 멤버십</p>
              <p className="text-3xl font-bold text-info">
                {activeMemberships}
              </p>
              <p className="text-xs text-gray-400 mt-1">유효한 멤버십</p>
            </div>
            <CreditCard className="w-8 h-8 text-info flex-shrink-0" />
          </div>
        </div>

        <div className="bg-base-100 shadow-lg rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">진행중 PT</p>
              <p className="text-3xl font-bold text-warning">{activePTs}</p>
              <p className="text-xs text-gray-400 mt-1">전체 활성 PT</p>
            </div>
            <CheckCircle className="w-8 h-8 text-warning flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          className="select select-bordered w-full md:w-64"
          value={selectedCenter}
          onChange={(e) => setSelectedCenter(e.target.value)}
        >
          <option value="">전체 센터</option>
          {centerOptions.map((center) => (
            <option key={center.id} value={center.id}>
              {center.title}
            </option>
          ))}
          <option value="no-center">미소속</option>
        </select>
      </div>

      {/* 회원 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMembers?.map((member) => (
          <div
            key={member.id}
            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="card-body p-6">
              {/* 프로필 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="avatar placeholder">
                  <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                    <span className="text-lg font-bold">
                      {member.username[0]}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="card-title text-lg truncate">
                    {member.username}
                  </h3>
                  <div className="flex items-center gap-2">
                    {member.active ? (
                      <span className="badge badge-success badge-sm">활성</span>
                    ) : (
                      <span className="badge badge-error badge-sm">비활성</span>
                    )}
                    {member.membership?.isActive && (
                      <span className="badge badge-info badge-sm">멤버십</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-2 mb-4">
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.mobile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{member.mobile}</span>
                  </div>
                )}
              </div>

              {/* 센터 정보 */}
              <div className="mb-4">
                {member.fitnessCenter ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="truncate font-medium">
                      {member.fitnessCenter.title}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Building className="w-4 h-4 flex-shrink-0" />
                    <span>미소속</span>
                  </div>
                )}
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">
                    {member.stats.activePt}
                  </div>
                  <div className="text-xs text-gray-500">활성 PT</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">
                    {member.stats.totalPt}
                  </div>
                  <div className="text-xs text-gray-500">총 PT</div>
                </div>
              </div>

              {/* 최근 활동 */}
              {member.recentLesson && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      최근 수업:{" "}
                      {new Date(
                        member.recentLesson.scheduledAt
                      ).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              )}

              {/* 멤버십 정보 */}
              {member.membership && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">
                      {member.membership.product.title}
                    </span>
                    {member.membership.closedAt && (
                      <span className="ml-2">
                        ~{" "}
                        {new Date(
                          member.membership.closedAt
                        ).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {filteredMembers?.length === 0 && (
        <div className="text-center py-12">
          <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            회원이 없습니다
          </h3>
          <p className="text-gray-400">
            {selectedCenter
              ? "선택된 센터에 등록된 회원이 없습니다."
              : "등록된 회원이 없습니다."}
          </p>
        </div>
      )}
    </div>
  );
}
