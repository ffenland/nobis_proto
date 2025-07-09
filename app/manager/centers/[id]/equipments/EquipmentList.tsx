"use client";

import { useState } from "react";
import Link from "next/link";
import { EquipmentCategory } from "@prisma/client";
import { categoryColors, categoryLabels } from "./constants";
import type { IEquipmentListItem } from "./actions";

interface EquipmentListProps {
  equipments: IEquipmentListItem[];
  centerId: string;
}

export default function EquipmentList({ equipments, centerId }: EquipmentListProps) {
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | "ALL">("ALL");

  // 필터링된 장비 목록 (필터링 후 title로 정렬)
  const filteredEquipments = (selectedCategory === "ALL" 
    ? equipments 
    : equipments.filter(equipment => equipment.category === selectedCategory)
  ).sort((a, b) => a.title.localeCompare(b.title));

  // 카테고리별 장비 수 계산 (전체 데이터 기준)
  const categoryStats = equipments.reduce((acc, equipment) => {
    acc[equipment.category] = (acc[equipment.category] || 0) + 1;
    return acc;
  }, {} as Record<EquipmentCategory, number>);

  return (
    <>
      {/* 카테고리 필터 */}
      {Object.keys(categoryStats).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리별 필터</h3>
          <div className="flex flex-wrap gap-3">
            {/* 전체 버튼 */}
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              전체 ({equipments.length})
            </button>
            
            {/* 카테고리별 버튼 */}
            {Object.entries(categoryStats).map(([category, count]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category as EquipmentCategory)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? `${categoryColors[category as EquipmentCategory].replace('bg-', 'bg-').replace('text-', 'text-')} ring-2 ring-offset-2 ring-blue-500`
                    : `${categoryColors[category as EquipmentCategory]} hover:ring-2 hover:ring-offset-2 hover:ring-gray-300`
                }`}
              >
                {categoryLabels[category as EquipmentCategory]} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 현재 필터 상태 표시 */}
      <div className="mb-6">
        <p className="text-gray-600">
          {selectedCategory === "ALL" 
            ? `전체 ${equipments.length}개의 운동기구`
            : `${categoryLabels[selectedCategory]} ${filteredEquipments.length}개의 운동기구`
          }
        </p>
      </div>

      {/* 장비 목록 */}
      {filteredEquipments.length === 0 ? (
        // 필터 결과가 없을 때
        <div className="text-center py-20">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCategory === "ALL" 
              ? "등록된 운동기구가 없습니다"
              : `${categoryLabels[selectedCategory]} 카테고리에 등록된 운동기구가 없습니다`
            }
          </h3>
          <p className="text-gray-500 mb-6">
            다른 카테고리를 선택하거나 새로운 운동기구를 등록해보세요.
          </p>
          <Link
            href={`/manager/centers/${centerId}/equipments/new`}
            className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            운동기구 등록하기
          </Link>
        </div>
      ) : (
        // 장비 그리드
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredEquipments.map((equipment) => (
            <Link
              key={equipment.id}
              href={`/manager/centers/${centerId}/equipments/${equipment.id}`}
              className="group block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* 장비 정보 */}
              <div className="p-4">
                {/* 카테고리 배지 */}
                <div className="mb-2">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      categoryColors[equipment.category]
                    }`}
                  >
                    {categoryLabels[equipment.category]}
                  </span>
                </div>

                {/* 기구 이름 */}
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {equipment.title}
                </h3>

                {/* 주요 값 */}
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    {equipment.primaryValue && equipment.primaryUnit && (
                      <span className="font-medium text-gray-900">
                        {equipment.primaryValue}
                        {equipment.primaryUnit}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">{equipment.quantity}개</div>
                </div>

                {/* 설명 (짧게) */}
                {equipment.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {equipment.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}