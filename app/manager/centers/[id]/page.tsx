// app/manager/centers/[id]/page.tsx - Part 1
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCenterDetail, getCenterStats } from "./actions";

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
      getCenterDetail(id),
      getCenterStats(id),
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
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                center.inOperation
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {center.inOperation ? "운영중" : "운영중단"}
            </div>
            <Link
              href={`/manager/centers/${id}/edit`}
              className="bg-gray-100 text-gray-900 text-center py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              수정
            </Link>
            <Link
              href="/manager/centers"
              className="bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors text-sm"
            >
              목록으로
            </Link>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            title="등록 회원"
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="활성 PT"
            value={stats.activePt}
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
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
                    <div className="flex items-center space-x-3">
                      {trainer.user.avatarMedia?.publicUrl ? (
                        <img
                          src={trainer.user.avatarMedia.publicUrl}
                          alt={trainer.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-600"
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
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {trainer.user.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          {trainer.user.email}
                        </p>
                      </div>
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
                    <div className="flex items-center space-x-3">
                      {member.user.avatarMedia?.publicUrl ? (
                        <img
                          src={member.user.avatarMedia.publicUrl}
                          alt={member.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-600"
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
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.username}
                        </p>
                      </div>
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
                  <div className="text-center pt-3">
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
                <div className="space-y-2">
                  <Link
                    href={`/manager/centers/${id}/facilities/machine`}
                    className="inline-block text-sm text-blue-600 hover:text-blue-800 mr-4"
                  >
                    머신 등록하기
                  </Link>
                  <Link
                    href={`/manager/centers/${id}/facilities/tool`}
                    className="inline-block text-sm text-blue-600 hover:text-blue-800"
                  >
                    운동기구 등록하기
                  </Link>
                </div>
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
                      href={`/manager/centers/${id}/facilities/machine/${machine.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      관리
                    </Link>
                  </div>
                ))}
                {center.machines.length > 5 && (
                  <div className="text-center pt-3">
                    <Link
                      href={`/manager/centers/${id}/facilities/machine`}
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
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {manager.user.avatarMedia?.publicUrl ? (
                      <img
                        src={manager.user.avatarMedia.publicUrl}
                        alt={manager.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
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
                      </div>
                    )}
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

        {/* 장비 관리 섹션 - 메인 하이라이트 */}
        <div className="mt-8">
          <InfoCard title="장비 관리">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 머신 관리 카드 */}
              <Link
                href={`/manager/centers/${id}/facilities/machine`}
                className="group block p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-200 rounded-lg group-hover:bg-blue-300 transition-colors">
                    <svg
                      className="w-8 h-8 text-blue-700"
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
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900">
                      머신 관리
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      웨이트 머신, 유산소 기구 등을 관리합니다
                    </p>
                    <div className="flex items-center mt-2 text-sm text-blue-600">
                      <span>등록된 머신: {center.machines.length}개</span>
                      <svg
                        className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
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
                </div>
              </Link>

              {/* 운동기구 관리 카드 */}
              <Link
                href={`/manager/centers/${id}/facilities/tool`}
                className="group block p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-200 rounded-lg group-hover:bg-green-300 transition-colors">
                    <svg
                      className="w-8 h-8 text-green-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-green-900">
                      운동기구 관리
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      덤벨, 바벨, 보조기구 등을 관리합니다
                    </p>
                    <div className="flex items-center mt-2 text-sm text-green-600">
                      <span>운동기구 관리하기</span>
                      <svg
                        className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
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
                </div>
              </Link>
            </div>
          </InfoCard>
        </div>

        {/* 기타 관리 - 축소된 퀵 액션 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            기타 관리
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                회원 관리
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

            <Link
              href={`/manager/centers/${id}/settings`}
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                센터 설정
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
