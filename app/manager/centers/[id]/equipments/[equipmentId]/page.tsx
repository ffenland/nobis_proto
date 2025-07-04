// app/manager/centers/[id]/equipments/[equipmentId]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getEquipmentDetail,
  updateEquipment,
  deleteEquipment,
} from "./actions";
import { categoryLabels, categoryColors } from "../constants";

interface PageProps {
  params: Promise<{
    id: string;
    equipmentId: string;
  }>;
}

const EquipmentEditPage = async ({ params }: PageProps) => {
  const { id: centerId, equipmentId } = await params;

  try {
    const equipment = await getEquipmentDetail(centerId, equipmentId);

    // 업데이트 액션
    const handleUpdate = async (formData: FormData) => {
      "use server";

      try {
        await updateEquipment(centerId, equipmentId, formData);
        redirect(`/manager/centers/${centerId}/equipments`);
      } catch (error) {
        console.error("업데이트 오류:", error);
        throw error;
      }
    };

    // 삭제 액션
    const handleDelete = async () => {
      "use server";

      try {
        await deleteEquipment(centerId, equipmentId);
        redirect(`/manager/centers/${centerId}/equipments`);
      } catch (error) {
        console.error("삭제 오류:", error);
        throw error;
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">장비 수정</h1>
            <p className="text-gray-600 mt-2">
              {equipment.fitnessCenter?.title} - {equipment.title}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/manager/centers/${centerId}/equipments`}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              목록으로
            </Link>
          </div>
        </div>

        {/* 장비 편집 폼 */}
        <form action={handleUpdate} className="space-y-8">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              기본 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 장비 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  장비 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={equipment.title}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="장비 이름을 입력하세요"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  defaultValue={equipment.category}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 수량 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수량
                </label>
                <input
                  type="number"
                  name="quantity"
                  defaultValue={equipment.quantity}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보관 위치
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue={equipment.location || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 덤벨 렉, 스트레칭 존"
                />
              </div>
            </div>
          </div>

          {/* 수치 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              수치 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 주요 값 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주요 값 (무게, 저항력 등)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="primaryValue"
                    defaultValue={equipment.primaryValue || ""}
                    step="0.1"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="값"
                  />
                  <input
                    type="text"
                    name="primaryUnit"
                    defaultValue={equipment.primaryUnit || ""}
                    className="w-24 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="단위"
                  />
                </div>
              </div>

              {/* 부차 값 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  부차 값 (길이, 지름 등)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    name="secondaryValue"
                    defaultValue={equipment.secondaryValue || ""}
                    step="0.1"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="값"
                  />
                  <input
                    type="text"
                    name="secondaryUnit"
                    defaultValue={equipment.secondaryUnit || ""}
                    className="w-24 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="단위"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 부가 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              부가 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 브랜드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  브랜드
                </label>
                <input
                  type="text"
                  name="brand"
                  defaultValue={equipment.brand || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="브랜드명"
                />
              </div>

              {/* 모델 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  모델
                </label>
                <input
                  type="text"
                  name="model"
                  defaultValue={equipment.model || ""}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="모델명"
                />
              </div>
            </div>

            {/* 설명 */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                name="description"
                defaultValue={equipment.description || ""}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="장비에 대한 상세 설명을 입력하세요"
              />
            </div>
          </div>

          {/* 현재 카테고리 표시 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              현재 카테고리
            </h3>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  categoryColors[equipment.category]
                }`}
              >
                {categoryLabels[equipment.category]}
              </span>
              <span className="text-gray-500">
                → 위에서 카테고리를 변경할 수 있습니다
              </span>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-between">
            <form action={handleDelete}>
              <button
                type="submit"
                className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
                onClick={(e) => {
                  if (
                    !confirm(
                      "정말로 이 장비를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                장비 삭제
              </button>
            </form>

            <div className="flex space-x-3">
              <Link
                href={`/manager/centers/${centerId}/equipments`}
                className="bg-gray-100 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </Link>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                변경사항 저장
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  } catch (error) {
    console.error("장비 편집 페이지 오류:", error);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            장비 정보를 불러올 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link
            href={`/manager/centers/${centerId}/equipments`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
};

export default EquipmentEditPage;
