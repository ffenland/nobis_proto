// app/manager/centers/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getCenterData } from "../../actions";
import CenterEditForm from "./CenterEditForm";

interface CenterEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CenterEditPage({ params }: CenterEditPageProps) {
  const { id } = await params;

  try {
    const center = await getCenterData(id);

    if (!center) {
      notFound();
    }

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">센터 정보 수정</h1>
          <p className="text-gray-600 mt-2">
            {center.title}의 정보를 수정합니다.
          </p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <CenterEditForm center={center} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("센터 수정 페이지 오류:", error);
    notFound();
  }
}
