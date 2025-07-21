// app/trainer/pt/[id]/[ptRecordId]/edit/page.tsx
import { checkEditTimePermissionAction } from "../actions";
import EditTimeRestrictionNotice from "./components/EditTimeRestrictionNotice";
import EditForm from "./components/EditForm";

interface PtRecordEditPageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

export default async function PtRecordEditPage({ params }: PtRecordEditPageProps) {
  const resolvedParams = await params;
  const { id: ptId, ptRecordId } = resolvedParams;

  try {
    // 편집 시간 제한 검증
    const timePermission = await checkEditTimePermissionAction(ptRecordId);

    // 편집 가능 시간이 아닌 경우 안내 페이지 표시
    if (!timePermission.canEdit) {
      return (
        <EditTimeRestrictionNotice
          ptId={ptId}
          ptRecordId={ptRecordId}
          timeInfo={timePermission}
        />
      );
    }

    // 편집 가능 시간인 경우 기존 편집 폼 표시
    return <EditForm ptId={ptId} ptRecordId={ptRecordId} />;

  } catch (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            오류가 발생했습니다
          </h1>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <a
            href={`/trainer/pt/${ptId}/${ptRecordId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            PT 기록으로 돌아가기
          </a>
        </div>
      </div>
    );
  }
}