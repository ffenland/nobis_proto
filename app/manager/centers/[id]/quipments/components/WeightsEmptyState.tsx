// app/manager/centers/[id]/facilities/weights/components/WeightsEmptyState.tsx
import Link from "next/link";

interface WeightsEmptyStateProps {
  centerId: string;
}

const WeightsEmptyState = ({ centerId }: WeightsEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* 아이콘 */}
        <div className="mx-auto w-24 h-24 bg-base-200 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-base-content opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* 메시지 */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-base-content">
            등록된 웨이트 기구가 없습니다
          </h3>
          <p className="text-base-content opacity-70 leading-relaxed">
            아직 웨이트 기구가 등록되지 않았습니다.
            <br />
            새로운 웨이트 기구를 추가해서 관리를 시작해보세요.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <Link
            href={`/manager/centers/${centerId}/facilities/weights/new`}
            className="btn btn-primary btn-wide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            첫 번째 웨이트 기구 추가하기
          </Link>

          <div>
            <Link
              href={`/manager/centers/${centerId}/facilities`}
              className="btn btn-ghost btn-sm"
            >
              시설 관리로 돌아가기
            </Link>
          </div>
        </div>

        {/* 도움말 */}
        <div className="text-xs text-base-content opacity-50 space-y-1">
          <p>
            💡 팁: 덤벨, 바벨, 케틀벨 등 다양한 웨이트 기구를 등록할 수 있습니다
          </p>
          <p>🏋️ 무게별로 구분해서 관리하면 더욱 효율적입니다</p>
        </div>
      </div>
    </div>
  );
};

export default WeightsEmptyState;
