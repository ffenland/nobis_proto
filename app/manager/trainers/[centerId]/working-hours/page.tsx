"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Clock, Save, Plus, Trash2 } from "lucide-react";

import { PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingPage } from "@/app/components/ui/Loading";
import { PageHeaderWithActions } from "@/app/components/ui/PageHeaderWithActions";
import { type ICenterWorkingHours } from "@/app/lib/services/fitness-center.service";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

const weekDays = [
  { key: "MON", label: "월요일" },
  { key: "TUE", label: "화요일" },
  { key: "WED", label: "수요일" },
  { key: "THU", label: "목요일" },
  { key: "FRI", label: "금요일" },
  { key: "SAT", label: "토요일" },
  { key: "SUN", label: "일요일" },
];

// 시간 옵션 생성 (00:00 ~ 24:00, 30분 단위)
const timeOptions = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 24:00은 특별 처리
  if (hours === 24) {
    return {
      value: 2400,
      label: "24:00",
    };
  }

  return {
    value: hours * 100 + minutes,
    label: `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`,
  };
});

interface WorkingHour {
  id?: string;
  dayOfWeek: string;
  openTime: number;
  closeTime: number;
}

export default function WorkingHoursPage() {
  const params = useParams();
  const centerId = params.centerId as string;

  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    data: centerData,
    error: centerError,
    isLoading: centerLoading,
    mutate,
  } = useSWR<{
    success: boolean;
    data: ICenterWorkingHours;
  }>(`/api/centers/${centerId}/working-hours`, fetcher);

  // 데이터가 로드되면 (캐시에서든 네트워크에서든) state 업데이트
  useEffect(() => {
    if (centerData?.success && centerData.data) {
      setWorkingHours(centerData.data.defaultWorkingHours || []);
    }
  }, [centerData]);

  const handleTimeChange = (
    dayOfWeek: string,
    field: "openTime" | "closeTime",
    value: number
  ) => {
    setWorkingHours((prev) => {
      const existing = prev.find((wh) => wh.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((wh) =>
          wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
        );
      } else {
        const newHour: WorkingHour = {
          dayOfWeek,
          openTime: field === "openTime" ? value : 900,
          closeTime: field === "closeTime" ? value : 1800,
        };
        return [...prev, newHour];
      }
    });

    setHasChanges(true);
  };

  const handleAddWorkingHour = (dayOfWeek: string) => {
    setWorkingHours((prev) => [
      ...prev,
      {
        dayOfWeek,
        openTime: 900,
        closeTime: 2200,
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveWorkingHour = (dayOfWeek: string) => {
    setWorkingHours((prev) => prev.filter((wh) => wh.dayOfWeek !== dayOfWeek));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/centers/${centerId}/working-hours`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workingHours: workingHours.map((wh) => ({
            dayOfWeek: wh.dayOfWeek,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("저장에 실패했습니다");
      }

      setHasChanges(false);
      await mutate();
      alert("근무시간이 성공적으로 저장되었습니다.");
    } catch (error) {
      console.error("저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (centerLoading) {
    return <LoadingPage message="센터 정보를 불러오는 중..." />;
  }

  if (centerError) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const center = centerData?.data;

  if (!center) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">센터를 찾을 수 없습니다</p>
          <Link href={`/manager/trainers/${centerId}`}>
            <Button variant="outline">센터 관리로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      <PageHeaderWithActions
        title={`${center.title} 근무시간 설정`}
        subtitle="센터의 기본 근무시간을 설정합니다"
        backHref={`/manager/trainers/${centerId}`}
        backLabel="센터 관리"
        actionButton={{
          label: "저장",
          loadingLabel: "저장 중...",
          onClick: handleSave,
          disabled: !hasChanges,
          loading: isSaving,
          icon: <Save className="w-4 h-4" />,
          className: "bg-blue-600 hover:bg-blue-700",
        }}
      />

      {/* 근무시간 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-semibold">요일별 근무시간</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map((day) => {
              const existingHour = workingHours.find(
                (wh) => wh.dayOfWeek === day.key
              );
              const defaultOpenTime = existingHour?.openTime || 900;
              const defaultCloseTime = existingHour?.closeTime || 2200;

              return (
                <div key={day.key} className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-700">
                    {day.label}
                  </div>

                  <div className="flex items-center space-x-4">
                    {existingHour ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={defaultOpenTime}
                          onChange={(e) =>
                            handleTimeChange(
                              day.key,
                              "openTime",
                              parseInt(e.target.value)
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        >
                          {timeOptions.map((time) => (
                            <option key={time.value} value={time.value}>
                              {time.label}
                            </option>
                          ))}
                        </select>

                        <span className="text-gray-500">~</span>

                        <select
                          value={defaultCloseTime}
                          onChange={(e) =>
                            handleTimeChange(
                              day.key,
                              "closeTime",
                              parseInt(e.target.value)
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        >
                          {timeOptions.map((time) => (
                            <option key={time.value} value={time.value}>
                              {time.label}
                            </option>
                          ))}
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveWorkingHour(day.key)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 text-sm">
                          근무시간 미설정
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddWorkingHour(day.key)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasChanges && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                변경사항이 있습니다. 저장하지 않으면 변경사항이 손실됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
