import { getCenterMachines } from "./actions";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const CenterMachines = async ({ params }: PageProps) => {
  const { id } = await params;
  const machines = await getCenterMachines(id);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* 머신 목록 섹션 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">머신 목록</h2>

        <div className="flex-1">
          {/* 머신 추가 버튼 */}
          <a
            href={`/manager/centers/${id}/facilities/machine/new`}
            className="btn btn-primary h-24 w-full flex flex-col items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
            <span>머신 추가</span>
          </a>
        </div>

        {/* 머신 목록 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {machines.length > 0 ? (
            machines.map((machine) => (
              <a
                key={machine.id}
                href={`/manager/centers/${id}/facilities/machine/${machine.id}`}
                className="btn btn-outline h-16 flex flex-col items-center justify-center gap-2 hover:btn-primary transition-colors"
              >
                <div className="text-lg font-semibold">{machine.title}</div>
              </a>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="text-gray-500">등록된 머신이 없습니다.</div>
                <div className="text-sm text-gray-400">
                  위의 &quot;머신 추가&quot; 버튼을 눌러 새로운 머신을
                  등록해보세요.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterMachines;
