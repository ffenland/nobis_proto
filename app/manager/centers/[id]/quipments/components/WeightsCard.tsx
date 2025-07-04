// app/manager/centers/[id]/facilities/weights/components/WeightsCard.tsx
import Link from "next/link";
import type { WeightsListItem } from "../actions";

interface WeightsCardProps {
  weight: WeightsListItem;
  centerId: string;
}

const WeightsCard = ({ weight, centerId }: WeightsCardProps) => {
  return (
    <Link
      href={`/manager/centers/${centerId}/facilities/weights/${weight.id}`}
      className="card bg-base-100 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group"
    >
      <div className="card-body p-4">
        {/* 기구 이름 */}
        <h3 className="card-title text-lg font-bold group-hover:text-primary transition-colors">
          {weight.title}
        </h3>

        {/* 무게 정보 */}
        <div className="flex items-center gap-2 mt-2">
          <div className="badge badge-primary badge-lg font-semibold">
            {weight.weight}
            {weight.unit}
          </div>
        </div>

        {/* 설명 */}
        {weight.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {weight.description}
          </p>
        )}

        {/* 카드 액션 영역 */}
        <div className="card-actions justify-end mt-4">
          <div className="btn btn-sm btn-outline btn-primary group-hover:btn-primary group-hover:text-white transition-all">
            상세보기
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
      </div>
    </Link>
  );
};

export default WeightsCard;
