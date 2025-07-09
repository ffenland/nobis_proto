// app/manager/centers/[id]/equipments/page.tsx
import Link from "next/link";
import { getCenterEquipments } from "./actions";
import EquipmentList from "./EquipmentList";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const CenterEquipmentsPage = async ({ params }: PageProps) => {
  const { id } = await params;

  try {
    const { center, equipments } = await getCenterEquipments(id);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex flex-col mb-8">
          <div className="flex justify-between items-center space-x-3">
            <div className="whitespace-nowrap">
              <h1 className="text-3xl font-bold text-gray-900">
                운동기구 관리
              </h1>
            </div>
            <Link
              href={`/manager/centers/${id}/equipments/new`}
              className="bg-blue-600 text-white p-2 text-sm flex justify-center items-center text-center rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              새 기구 등록
            </Link>
            <Link
              href={`/manager/centers/${id}`}
              className="bg-gray-100 text-gray-900 p-2 text-sm flex justify-center items-center text-center rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              센터로 돌아가기
            </Link>
          </div>
          <div>
            <p className="text-gray-600 mt-2">
              {center.title} - 총 {equipments.length}개의 운동기구
            </p>
          </div>
        </div>

        {/* 장비 목록 및 필터링 */}
        <EquipmentList equipments={equipments} centerId={id} />

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
