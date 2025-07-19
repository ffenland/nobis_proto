// app/trainer/schedule/off/components/OffScheduleList.tsx
"use client";

import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

interface OffSchedule {
  id: string;
  date: string;
  startTime: number;
  endTime: number;
  createdAt: string;
}

interface OffScheduleListProps {
  offSchedules: OffSchedule[];
  onDelete: (scheduleId: string) => void;
}

export default function OffScheduleList({ offSchedules, onDelete }: OffScheduleListProps) {
  // 시간 포맷팅 (군대식 시간 지원)
  const formatTime = (militaryTime: number) => {
    if (militaryTime === 0) return "00:00";
    if (militaryTime === 2400) return "24:00";
    const hour = Math.floor(militaryTime / 100);
    const minute = militaryTime % 100;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  // 종일 휴무 여부 확인
  const isFullDay = (startTime: number, endTime: number) => {
    return startTime === 0 && endTime === 0;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  // 과거 날짜 필터링 (현재 날짜 기준)
  const getCurrentDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const futureSchedules = offSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);
    return scheduleDate >= getCurrentDate();
  });

  // 날짜순으로 정렬
  const sortedSchedules = futureSchedules.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() === dateB.getTime()) {
      return a.startTime - b.startTime;
    }
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">
          등록된 오프 일정 ({sortedSchedules.length}개)
        </h2>
      </CardHeader>
      <CardContent>
        {sortedSchedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 오프 일정이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {formatDate(schedule.date)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {isFullDay(schedule.startTime, schedule.endTime) ? (
                        <span className="font-medium text-green-600">종일</span>
                      ) : (
                        `${formatTime(schedule.startTime)} ~ ${formatTime(schedule.endTime)}`
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    등록일: {formatDate(schedule.createdAt)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(schedule.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}