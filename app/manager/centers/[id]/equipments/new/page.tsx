// app/manager/centers/[id]/equipments/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCenterInfo, createEquipment } from "./actions";
import { categoryLabels } from "../constants";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const EquipmentNewPage = async ({ params }: PageProps) => {
  const { id: centerId } = await params;

  try {
    const center = await getCenterInfo(centerId);

    // 생성 액션
    const handleCreate = async (formData: FormData) => {
      "use server";

      try {
        const result = await createEquipment(centerId, formData);
        if (result.success) {
          redirect(`/manager/centers/${centerId}/equipments`);
        }
      } catch (error) {
        console.error("생성 오류:", error);
        throw error;
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex flex-col items-start gap-3 mb-2">
          <div className="flex w-full justify-between items-center space-x-3">
            <div className="flex justify-center items-center">
              <h1 className="text-3xl font-bold text-gray-900">새 장비 등록</h1>
            </div>
            <Link
              href={`/manager/centers/${centerId}/equipments`}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              목록으로
            </Link>
          </div>
          <div>
            <p className="text-gray-600 ">
              {center.title} - 새로운 운동기구를 등록합니다
            </p>
          </div>
        </div>

        {/* 장비 생성 폼 */}
        <form action={handleCreate} className="space-y-8">
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
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 덤벨 20kg, 고무밴드 옐로우"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    카테고리를 선택하세요
                  </option>
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
                  defaultValue="1"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 덤벨 렉, 스트레칭 존, 밴드 보관함"
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
                    step="0.1"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="값"
                  />
                  <input
                    type="text"
                    name="primaryUnit"
                    className="w-16 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="단위"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  예: 20kg, 15lbs, 2level
                </p>
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
                    step="0.1"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="값"
                  />
                  <input
                    type="text"
                    name="secondaryUnit"
                    className="w-16 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="단위"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  예: 220cm, 28mm (선택사항)
                </p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: Nike, Adidas, TRX"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="모델명 또는 제품번호"
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
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="장비에 대한 상세 설명을 입력하세요&#10;예: 초보자용 고무밴드, 15파운드 저항력&#10;예: 고품질 고무 원판, 직경 45cm"
              />
            </div>
          </div>

          {/* 도움말 */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              💡 등록 팁
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>카테고리별 예시:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>웨이트:</strong> 덤벨, 바벨, 원판, 케틀벨
                </li>
                <li>
                  <strong>유산소:</strong> 러닝머신, 실내자전거, 스텝박스
                </li>
                <li>
                  <strong>저항:</strong> 고무밴드, 저항밴드, 루프밴드
                </li>
                <li>
                  <strong>기능성:</strong> 폼롤러, 밸런스볼, 보수볼
                </li>
                <li>
                  <strong>가동성:</strong> 요가매트, 스트레칭 도구
                </li>
                <li>
                  <strong>코어:</strong> 메디신볼, 슬라이딩 디스크
                </li>
                <li>
                  <strong>특수:</strong> 샌드백, 배틀로프, TRX
                </li>
              </ul>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-3">
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
              장비 등록
            </button>
          </div>
        </form>
      </div>
    );
  } catch (error) {
    console.error("장비 생성 페이지 오류:", error);

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
            페이지를 불러올 수 없습니다
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

export default EquipmentNewPage;
