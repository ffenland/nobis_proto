// app/trainer/schedule/page.tsx
import { Suspense } from "react";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { getWeeklySchedule } from "./actions";
import { convertUTCtoKST } from "@/app/lib/utils";

interface ISchedulePageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

export default async function TrainerSchedulePage({
  searchParams,
}: ISchedulePageProps) {
  const params = await searchParams;

  // URL에서 주차 정보 파싱 (YYYY-MM-DD 형식)
  const weekParam = params.week;
  const currentDate = weekParam ? new Date(weekParam) : new Date();

  // 초기 데이터 로드 (1개월분)
  const initialData = await getWeeklySchedule(currentDate, 1);

  // UTC를 KST로 변환
  const schedulesWithKST = initialData.schedules.map((schedule) => ({
    ...schedule,
    ptSchedule: {
      ...schedule.ptSchedule,
      date: convertUTCtoKST(schedule.ptSchedule.date),
    },
  }));

  const offsWithKST = initialData.offs.map((off) => ({
    ...off,
    date: convertUTCtoKST(off.date),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주간 스케줄</h1>
          <p className="text-gray-600">PT 수업과 휴무 일정을 확인하세요</p>
        </div>

        <Suspense fallback={<ScheduleLoading />}>
          <ScheduleCalendar
            initialCurrentDate={currentDate}
            initialSchedules={schedulesWithKST}
            initialOffs={offsWithKST}
            hasNextMonth={initialData.hasNextMonth}
            hasPrevMonth={initialData.hasPrevMonth}
          />
        </Suspense>
      </div>
    </div>
  );
}

// 로딩 컴포넌트
function ScheduleLoading() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-0">
          {/* 헤더 */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 border-r border-b"></div>
          ))}

          {/* 시간 슬롯들 */}
          {Array.from({ length: 28 * 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 bg-gray-50 border-r border-b animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
