// app/manager/centers/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCenterData, getCenterStatsData } from "../actions";

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
    MON: "월요일",
    TUE: "화요일",
    WED: "수요일",
    THU: "목요일",
    FRI: "금요일",
    SAT: "토요일",
    SUN: "일요일",
  };
  return weekDayMap[day] || day;
}

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// 인포 카드 컴포넌트
function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

interface CenterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CenterDetailPage({
  params,
}: CenterDetailPageProps) {
  const { id } = await params;

  try {
    const [center, stats] = await Promise.all([
      getCenterData(id),
      getCenterStatsData(id),
    ]);

    if (!center) {
      notFound();
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{center.title}</h1>
            <p className="text-gray-600 mt-2">{center.address}</p>
            <p className="text-gray-600">{center.phone}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/manager/centers/${id}/edit`}
              className="bg-gray-100 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              수정
            </Link>
            <Link
              href="/manager/centers"
              className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              목록으로
            </Link>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="총 회원수"
            value={stats.members}
            icon={
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="소속 트레이너"
            value={stats.trainers}
            icon={
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          />
          <StatCard
            title="보유 기구"
            value={stats.machines}
            icon={
              <svg
                className="w-5 h-5 text-gray-600"
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
            }
          />
        </div>

        {/* 콘텐츠 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 센터 소개 */}
          {center.description && (
            <InfoCard title="센터 소개">
              <p className="text-gray-700 leading-relaxed">
                {center.description}
              </p>
            </InfoCard>
          )}

          {/* 영업시간 */}
          <InfoCard title="영업시간">
            <div className="space-y-3">
              {center.openingHours.map((hour) => (
                <div
                  key={hour.id}
                  className="flex justify-between items-center"
                >
                  <span className="font-medium text-gray-900">
                    {displayWeekDay(hour.dayOfWeek)}
                  </span>
                  <span className="text-gray-600">
                    {hour.isClosed
                      ? "휴무"
                      : `${displayTime(hour.openTime)} ~ ${displayTime(
                          hour.closeTime
                        )}`}
                  </span>
                </div>
              ))}
            </div>
          </InfoCard>

          {/* 소속 트레이너 */}
          <InfoCard title="소속 트레이너">
            {center.trainers.length === 0 ? (
              <p className="text-gray-500">배정된 트레이너가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {center.trainers.map((trainer) => (
                  <div
                    key={trainer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {trainer.user.username}
                      </p>
                      <p className="text-sm text-gray-600">
                        {trainer.user.email}
                      </p>
                    </div>
                    <Link
                      href={`/manager/trainers/${trainer.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      상세보기
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* 센터 회원 */}
          <InfoCard title="센터 회원">
            {center.members.length === 0 ? (
              <p className="text-gray-500">등록된 회원이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {center.members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user.username}
                      </p>
                    </div>
                    <Link
                      href={`/manager/members/${member.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      상세보기
                    </Link>
                  </div>
                ))}
                {center.members.length > 5 && (
                  <div className="text-center">
                    <Link
                      href={`/manager/centers/${id}/members`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      전체 회원 보기 ({center.members.length - 5}명 더)
                    </Link>
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* 보유 기구 */}
          <InfoCard title="보유 기구">
            {center.machines.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">등록된 기구가 없습니다.</p>
                <Link
                  href={`/manager/centers/${id}/machines`}
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  기구 등록하기
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {center.machines.slice(0, 5).map((machine) => (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {machine.title}
                      </p>
                    </div>
                    <Link
                      href={`/manager/centers/${id}/machines/${machine.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      관리
                    </Link>
                  </div>
                ))}
                {center.machines.length > 5 && (
                  <div className="text-center">
                    <Link
                      href={`/manager/centers/${id}/machines`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      전체 기구 보기 ({center.machines.length - 5}개 더)
                    </Link>
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* 관리진 */}
          <InfoCard title="관리진">
            {center.managers.length === 0 ? (
              <p className="text-gray-500">배정된 관리자가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {center.managers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {manager.user.username}
                      </p>
                      <p className="text-sm text-gray-600">
                        {manager.user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>
        </div>

        {/* 퀵 액션 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            빠른 작업
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href={`/manager/centers/${id}/machines`}
              className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-gray-600 mb-2"
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
              <span className="text-sm font-medium text-gray-900">
                기구 관리
              </span>
            </Link>

            <Link
              href={`/manager/centers/${id}/members`}
              className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-gray-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                회원 관리
              </span>
            </Link>

            <Link
              href={`/manager/centers/${id}/trainers`}
              className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-gray-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                트레이너 관리
              </span>
            </Link>

            <Link
              href={`/manager/centers/${id}/stats`}
              className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-gray-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                통계 보기
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("센터 조회 오류:", error);
    notFound();
  }
}
