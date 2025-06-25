// app/manager/centers/new/page.tsx
import { getAvailableTrainersData } from "../actions";
import CenterForm from "./CenterForm";

export default async function NewCenterPage() {
  const trainers = await getAvailableTrainersData();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">새 센터 등록</h1>
        <p className="text-gray-600 mt-2">
          새로운 피트니스 센터 정보를 입력해주세요.
        </p>
      </div>

      {/* 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <CenterForm trainers={trainers} />
      </div>
    </div>
  );
}
