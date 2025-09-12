"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { getEquipmentTitle } from "@/app/lib/utils/equipment.utils";
import type { GetCenterEquipmentsResult } from "@/app/services/fitness-center/equipment.service";

// 데이터 페처
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CenterEquipmentsPage() {
  const params = useParams();
  const centerId = params.id as string;

  // 필터 상태
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // API 데이터 가져오기
  const {
    data: equipments,
    error,
    isLoading,
  } = useSWR<GetCenterEquipmentsResult>(
    centerId ? `/api/fitness-center/${centerId}/equipments` : null,
    fetcher
  );

  // 센터 정보 가져오기
  const { data: centerInfo } = useSWR<{ title: string }>(
    centerId ? `/api/manager/centers/${centerId}` : null,
    fetcher
  );

  // 필터 옵션 계산
  const { groupOptions, brandOptions } = useMemo(() => {
    if (!equipments) return { groupOptions: [], brandOptions: [] };

    // 그룹 옵션 추출 (중복 제거)
    const groups = Array.from(
      new Set(equipments.map((eq) => eq.group.name))
    ).sort();

    // 브랜드 옵션 추출 (null 포함, 중복 제거)
    const brands = Array.from(
      new Set(equipments.map((eq) => eq.brand?.name || null))
    ).sort((a, b) => {
      if (a === null) return 1; // null을 마지막으로
      if (b === null) return -1;
      return a.localeCompare(b, "ko");
    });

    return {
      groupOptions: groups,
      brandOptions: brands,
    };
  }, [equipments]);

  // 필터링된 장비 목록
  const filteredEquipments = useMemo(() => {
    if (!equipments) return [];

    return equipments.filter((equipment) => {
      // 그룹 필터
      if (selectedGroup !== "all" && equipment.group.name !== selectedGroup) {
        return false;
      }

      // 브랜드 필터
      if (selectedBrand !== "all") {
        if (selectedBrand === "기타" && equipment.brand !== null) {
          return false;
        }
        if (
          selectedBrand !== "기타" &&
          equipment.brand?.name !== selectedBrand
        ) {
          return false;
        }
      }

      return true;
    });
  }, [equipments, selectedGroup, selectedBrand]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">장비 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>장비 목록을 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!equipments) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {centerInfo?.title || "센터"} 운동기구
            </h1>
            <p className="text-gray-600">
              보유하고 있는 모든 운동기구를 관리하세요
            </p>
          </div>
          <Link
            href={`/manager/centers/${centerId}/equipments/new`}
            className="btn btn-primary"
          >
            새 장비 추가
          </Link>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 그룹 필터 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">운동기구 종류</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="all">전체</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* 브랜드 필터 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">브랜드</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="all">전체</option>
                {brandOptions.map((brand) => (
                  <option key={brand || "기타"} value={brand || "기타"}>
                    {brand || "기타"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 필터 결과 표시 */}
          <div className="mt-4 text-sm text-gray-600">
            총 {equipments.length}개 장비 중 {filteredEquipments.length}개 표시
          </div>
        </div>
      </div>

      {/* 장비 목록 */}
      {filteredEquipments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            해당 조건의 장비가 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            다른 필터 조건을 선택하거나 새로운 장비를 추가해보세요
          </p>
          <Link
            href={`/manager/centers/${centerId}/equipments/new`}
            className="btn btn-primary"
          >
            첫 번째 장비 추가하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipments.map((equipment) => (
            <Link
              key={equipment.id}
              href={`/manager/centers/${centerId}/equipments/${equipment.id}`}
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="card-body p-4">
                {/* 장비 타이틀 */}
                <h3 className="card-title text-base mb-2">
                  {getEquipmentTitle({
                    group: equipment.group,
                    primaryValue: equipment.primaryValue,
                    primaryUnit: equipment.primaryUnit,
                  })}
                </h3>

                {/* 장비 정보 */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>종류:</span>
                    <span className="font-medium">{equipment.group.name}</span>
                  </div>

                  {equipment.brand && (
                    <div className="flex justify-between">
                      <span>브랜드:</span>
                      <span className="font-medium">
                        {equipment.brand.name}
                      </span>
                    </div>
                  )}

                  {equipment.model && (
                    <div className="flex justify-between">
                      <span>모델:</span>
                      <span className="font-medium">{equipment.model}</span>
                    </div>
                  )}
                </div>

                {/* 설명 (있는 경우) */}
                {equipment.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {equipment.description}
                  </p>
                )}

                {/* 상태 표시 */}
                <div className="flex justify-end mt-3">
                  <div className="badge badge-ghost badge-sm">상세 보기 →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
