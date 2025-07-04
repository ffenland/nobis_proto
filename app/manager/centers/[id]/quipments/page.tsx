// app/manager/centers/[id]/facilities/weights/page.tsx
import Link from "next/link";
import { getCenterWeights, getCenterInfo } from "./actions";
import WeightsCard from "./components/WeightsCard";
import WeightsEmptyState from "./components/WeightsEmptyState";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const CenterWeightsPage = async ({ params }: PageProps) => {
  const { id } = await params;

  try {
    // 병렬로 데이터 로드
    const [weights, center] = await Promise.all([
      getCenterWeights(id),
      getCenterInfo(id),
    ]);

    return (
      <div className="container mx-auto p-4 space-y-6">
        {/* 헤더 섹션 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">웨이트 기구 관리</h1>
              <p className="text-gray-600 mt-1">{center.title}</p>
            </div>
            <Link
              href={`/manager/centers/${id}/facilities/weights/new`}
              className="btn btn-primary"
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
              웨이트 기구 추가
            </Link>
          </div>

          {/* 통계 정보 */}
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">총 기구 수</div>
              <div className="stat-value text-primary">{weights.length}</div>
              <div className="stat-desc">등록된 웨이트 기구</div>
            </div>
            <div className="stat">
              <div className="stat-title">무게 범위</div>
              <div className="stat-value text-secondary">
                {weights.length > 0
                  ? `${Math.min(...weights.map((w) => w.weight))} - ${Math.max(
                      ...weights.map((w) => w.weight)
                    )}${weights[0]?.unit || "kg"}`
                  : "0kg"}
              </div>
              <div className="stat-desc">최소 - 최대 무게</div>
            </div>
          </div>
        </div>

        {/* 웨이트 기구 목록 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">웨이트 기구 목록</h2>

          {weights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {weights.map((weight) => (
                <WeightsCard key={weight.id} weight={weight} centerId={id} />
              ))}
            </div>
          ) : (
            <WeightsEmptyState centerId={id} />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading weights page:", error);
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>데이터를 불러오는 중 오류가 발생했습니다.</span>
        </div>
      </div>
    );
  }
};

export default CenterWeightsPage;
