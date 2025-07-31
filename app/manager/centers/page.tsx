// app/manager/centers/page.tsx
import Link from "next/link";
import { getCentersData } from "./actions";
import type { ICenterSummary } from "@/app/manager/centers/actions";

// 시간 표시 유틸리티
function displayTime(time: number): string {
  const hours = Math.floor(time / 100);
  const minutes = time % 100;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

// 요일 표시 유틸리티
function displayWeekDay(day: string): string {
  const weekDayMap: Record<string, string> = {
    MON: "월",
    TUE: "화",
    WED: "수",
    THU: "목",
    FRI: "금",
    SAT: "토",
    SUN: "일",
  };
  return weekDayMap[day] || day;
}

// 센터 카드 컴포넌트
function CenterCard({ center }: { center: ICenterSummary }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {center.title}
          </h3>
          <p className="text-gray-600 text-sm mb-1">{center.address}</p>
          <p className="text-gray-600 text-sm">{center.phone}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 space-y-1">
            <span className="block">회원 {center._count.members}명</span>
            <span className="block">머신 {center._count.machines}개</span>
            <span className="block">운동기구 {center._count.equipments}개</span>
          </div>
        </div>
      </div>

      {center.description && (
        <p className="text-gray-700 text-sm mb-4 line-clamp-2">
          {center.description}
        </p>
      )}

      {/* 트레이너 목록 */}
      {center.trainers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            소속 트레이너
          </h4>
          <div className="flex flex-wrap gap-2">
            {center.trainers.map((trainer) => (
              <span
                key={trainer.id}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {trainer.user.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 영업시간 */}
      {center.openingHours.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">영업시간</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {center.openingHours
              .filter((hour) => !hour.isClosed)
              .map((hour) => (
                <div key={hour.dayOfWeek} className="flex justify-start gap-4">
                  <span>{displayWeekDay(hour.dayOfWeek)}</span>
                  <span>
                    {displayTime(hour.openTime)} ~ {displayTime(hour.closeTime)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 - 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/manager/centers/${center.id}`}
          className="bg-gray-900 text-white text-center py-2 px-4 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          상세보기
        </Link>
        <Link
          href={`/manager/centers/${center.id}/edit`}
          className="bg-gray-100 text-gray-900 text-center py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          센터 수정
        </Link>
        <Link
          href={`/manager/centers/${center.id}/machines`}
          className="bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          머신 관리
        </Link>
        <Link
          href={`/manager/centers/${center.id}/equipments`}
          className="bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          운동기구 관리
        </Link>
      </div>
    </div>
  );
}

// 빈 상태 컴포넌트
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4m0 0v-4a1 1 0 011-1h1a1 1 0 011 1v4m-4 0h4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        등록된 센터가 없습니다
      </h3>
      <p className="text-gray-500 mb-6">첫 번째 센터를 등록해보세요.</p>
      <Link
        href="/manager/centers/new"
        className="inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
      >
        센터 등록하기
      </Link>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default async function CentersPage() {
  const centers = await getCentersData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">센터 관리</h1>
          <p className="text-gray-600 mt-2">
            총 {centers.length}개의 센터가 등록되어 있습니다.
          </p>
        </div>
        <Link
          href="/manager/centers/new"
          className="bg-gray-900 text-white px-3 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium"
        >
          새 센터 등록
        </Link>
      </div>

      {/* 센터 목록 */}
      {centers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {centers.map((center) => (
            <CenterCard key={center.id} center={center} />
          ))}
        </div>
      )}
    </div>
  );
}