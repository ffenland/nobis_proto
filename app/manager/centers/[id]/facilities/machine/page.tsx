"use client";

import { use, useEffect, useRef, useState } from "react";
import { IMachineListItem, getAllMachineListOfCenter } from "./actions";
import { useRouter } from "next/navigation";

type IParams = Promise<{
  id: string;
}>;

const CenterMachines = (props: { params: IParams }) => {
  const { id } = use(props.params);
  const center = useRef<{ id: string; title: string }>(null);
  const [machines, setMachines] = useState<IMachineListItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAllMachineListOfCenter(id);
        if (result.ok) {
          setMachines(result.data.machines);
          center.current = result.data.center;
        } else {
          alert(result.error.message);
        }
      } catch (error) {
        console.error("데이터를 가져오는데 실패했습니다:", error);
      }
    };

    fetchData();
  }, [id]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* 머신 목록 섹션 */}
      <div className="flex flex-col gap-2 ">
        <h2 className="text-xl font-bold">{center.current?.title} 머신 목록</h2>
        <div className="flex-1">
          {/* 머신 추가 버튼 */}
          <button
            onClick={() => {
              if (center.current) {
                router.push(
                  `/manager/centers/${center.current.id}/facilities/machine/new`
                );
              } else {
                alert("센터를 찾을 수 없습니다.");
              }
            }}
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
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 머신 목록 */}
          {machines.map((machine) => (
            <button
              key={machine.id}
              onClick={() =>
                router.push(
                  `/manager/centers/${id}/facilities/machine/${machine.id}`
                )
              }
              className="btn btn-outline h-16 flex flex-col items-center justify-center gap-2 hover:btn-primary"
            >
              <div className="text-lg font-semibold">{machine.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CenterMachines;
