// app/manager/centers/[id]/equipments/page.tsx
import Link from "next/link";
import { getCenterEquipments } from "./actions";
import { EquipmentCategory } from "@prisma/client";
import { categoryColors, categoryLabels } from "./constants";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const CenterEquipmentsPage = async ({ params }: PageProps) => {
  const { id } = await params;

  try {
    const { center, equipments } = await getCenterEquipments(id);

    // 카테고리별 장비 수 계산
    const categoryStats = equipments.reduce((acc, equipment) => {
      acc[equipment.category] = (acc[equipment.category] || 0) + 1;
      return acc;
    }, {} as Record<EquipmentCategory, number>);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">운동기구 관리</h1>
            <p className="text-gray-600 mt-2">
              {center.title} - 총 {equipments.length}개의 운동기구
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/manager/centers/${id}/equipments/new`}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              새 기구 등록
            </Link>
            <Link
              href={`/manager/centers/${id}`}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              센터로 돌아가기
            </Link>
          </div>
        </div>

        {/* 카테고리별 통계 */}
        {Object.keys(categoryStats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div
                key={category}
                className="bg-white rounded-lg p-4 border border-gray-200 text-center"
              >
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">
                  {categoryLabels[category as EquipmentCategory]}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 장비 목록 */}
        {equipments.length === 0 ? (
          // 빈 상태
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
              등록된 운동기구가 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              첫 번째 운동기구를 등록해서 장비 관리를 시작해보세요.
            </p>
            <Link
              href={`/manager/centers/${id}/equipments/new`}
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
            {equipments.map((equipment) => (
              <Link
                key={equipment.id}
                href={`/manager/centers/${id}/equipments/${equipment.id}`}
                className="group block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* 장비 이미지 */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {equipment.photos.length > 0 ? (
                    <img
                      src={equipment.photos[0].publicUrl}
                      alt={equipment.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
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
                  )}
                </div>

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

        {/* 장비가 있을 때만 하단 추가 버튼 표시 */}
        {equipments.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href={`/manager/centers/${id}/equipments/new`}
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
              새 운동기구 등록
            </Link>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("운동기구 목록 조회 오류:", error);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            데이터를 불러올 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
};

export default CenterEquipmentsPage;
