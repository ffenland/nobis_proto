"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import type { GetCenterEquipmentsResult } from "@/app/services/fitness-center/equipment.service";

// 데이터 페처
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CenterEquipmentsPage() {
  const params = useParams();
  const centerId = params.id as string;

  // API 데이터 가져오기 (센터 정보 포함)
  const {
    data,
    error,
    isLoading,
  } = useSWR<GetCenterEquipmentsResult>(
    centerId ? `/api/fitness-center/${centerId}/equipments` : null,
    fetcher
  );

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

  if (!data) {
    return null;
  }

  const { centerTitle, equipments } = data;

  return (
    <div className="h-full container mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {centerTitle} 운동기구
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

      {/* 장비 개수 표시 */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">
          총 {equipments.length}개의 장비가 등록되어 있습니다
        </div>
      </div>

      {/* 장비 목록 */}
      {equipments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            등록된 장비가 없습니다
          </h3>
          <p className="text-gray-500 mb-6">첫 번째 운동기구를 추가해보세요</p>
          <Link
            href={`/manager/centers/${centerId}/equipments/new`}
            className="btn btn-primary"
          >
            첫 번째 장비 추가하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipments.map((equipment) => (
            <Link
              key={equipment.id}
              href={`/manager/centers/${centerId}/equipments/${equipment.id}`}
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="card-body p-4">
                {/* 장비 타이틀 */}
                <h3 className="card-title text-base mb-2">{equipment.title}</h3>

                {/* 장비 정보 */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>단위:</span>
                    <span className="font-medium">{equipment.unit}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>등록일:</span>
                    <span className="font-medium">
                      {new Date(equipment.createdAt).toLocaleDateString(
                        "ko-KR"
                      )}
                    </span>
                  </div>

                  {equipment.images && equipment.images.length > 0 && (
                    <div className="flex justify-between">
                      <span>이미지:</span>
                      <span className="font-medium text-blue-600">
                        {equipment.images.length}개
                      </span>
                    </div>
                  )}
                </div>

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
