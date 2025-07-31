// app/manager/centers/[id]/machines/page.tsx
import Link from "next/link";
import { getCenterMachines } from "./actions";
import Image from "next/image";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const CenterMachinesPage = async ({ params }: PageProps) => {
  const { id } = await params;

  try {
    const { center, machines } = await getCenterMachines(id);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex flex-col  mb-8">
          <div className="flex justify-between items-center space-x-3">
            <div className="whitespace-nowrap">
              <h1 className="text-3xl font-bold text-gray-900">머신 관리</h1>
            </div>
            <Link
              href={`/manager/centers/${id}/machines/new`}
              className="bg-blue-600 text-white p-2 text-sm flex justify-center items-center rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              새 머신 등록
            </Link>
            <Link
              href={`/manager/centers/${id}`}
              className="bg-gray-100 text-gray-900 p-2 text-sm flex justify-center items-center rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              센터로 돌아가기
            </Link>
          </div>
          <div>
            <p className="text-gray-600 mt-2">
              {center.title} - 총 {machines.length}개의 머신
            </p>
          </div>
        </div>

        {/* 머신 목록 */}
        {machines.length === 0 ? (
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
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              등록된 머신이 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              첫 번째 머신을 등록해서 센터 장비 관리를 시작해보세요.
            </p>
            <Link
              href={`/manager/centers/${id}/machines/new`}
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
              머신 등록하기
            </Link>
          </div>
        ) : (
          // 머신 그리드
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {machines.map((machine) => (
              <Link
                key={machine.id}
                href={`/manager/centers/${id}/machines/${machine.id}`}
                className="group block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                {/* 머신 이미지 */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {machine.images.length > 0 ? (
                    <Image
                      src={`https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${machine.images[0].cloudflareId}/avatar`}
                      alt={machine.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-16 h-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 머신 정보 */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {machine.title}
                  </h3>

                  {/* 설정 개수 */}
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    설정 {machine.machineSetting.length}개
                  </div>

                  {/* 설정 목록 미리보기 */}
                  {machine.machineSetting.length > 0 && (
                    <div className="space-y-1">
                      {machine.machineSetting.slice(0, 2).map((setting) => (
                        <div
                          key={setting.id}
                          className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded"
                        >
                          {setting.title} ({setting.unit})
                        </div>
                      ))}
                      {machine.machineSetting.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{machine.machineSetting.length - 2}개 더
                        </div>
                      )}
                    </div>
                  )}

                  {/* 관리 링크 */}
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    <span>관리하기</span>
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 머신이 있을 때만 하단 추가 버튼 표시 */}
        {machines.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href={`/manager/centers/${id}/machines/new`}
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
              새 머신 등록
            </Link>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("머신 목록 조회 오류:", error);

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

export default CenterMachinesPage;
