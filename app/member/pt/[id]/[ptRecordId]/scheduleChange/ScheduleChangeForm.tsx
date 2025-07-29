// app/trainer/pt/[id]/[ptRecordId]/scheduleChange/ScheduleChangeForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { createScheduleChangeRequestAction } from "./actions";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MessageSquare } from "lucide-react";

interface ScheduleChangeFormProps {
  ptRecordId: string;
  currentSchedule: {
    date: Date;
    startTime: number;
    endTime: number;
  };
  ptProduct: {
    title: string;
    time: number;
  };
  ptId: string;
}

const ScheduleChangeForm = ({
  ptRecordId,
  currentSchedule,
  ptProduct,
}: ScheduleChangeFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedDate: new Date(currentSchedule.date).toISOString().split("T")[0],
    startTime: currentSchedule.startTime,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestedStartTime = formData.startTime;
      
      // PT 상품의 duration(분)을 이용해 종료 시간 계산
      const startHour = Math.floor(requestedStartTime / 100);
      const startMinute = requestedStartTime % 100;
      const totalMinutes = startHour * 60 + startMinute + ptProduct.time;
      const endHour = Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;
      const requestedEndTime = endHour * 100 + endMinute;

      await createScheduleChangeRequestAction(
        ptRecordId,
        formData.requestedDate,
        requestedStartTime,
        requestedEndTime,
        formData.reason
      );

      alert("일정 변경 요청이 전송되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("일정 변경 요청 오류:", error);
      alert(
        error instanceof Error ? error.message : "요청 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = hour * 100 + minute;
        const displayText = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        options.push({ value: timeValue, label: displayText });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();
  
  // 선택된 시작 시간에 따른 종료 시간 계산
  const calculateEndTime = (startTime: number) => {
    const startHour = Math.floor(startTime / 100);
    const startMinute = startTime % 100;
    const totalMinutes = startHour * 60 + startMinute + ptProduct.time;
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;
    return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 날짜 선택 */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4" />
          변경 희망 날짜
        </label>
        <input
          type="date"
          value={formData.requestedDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, requestedDate: e.target.value }))
          }
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* 시간 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            시작 시간
          </label>
          <select
            value={formData.startTime}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                startTime: Number(e.target.value),
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {timeOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            종료 시간 (자동 계산)
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
            {calculateEndTime(formData.startTime)}
            <span className="text-sm text-gray-500 ml-2">({ptProduct.time}분 수업)</span>
          </div>
        </div>
      </div>

      {/* 변경 사유 */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4" />
          변경 사유
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, reason: e.target.value }))
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="일정 변경이 필요한 이유를 입력해주세요..."
          required
        />
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "요청 중..." : "일정 변경 요청"}
        </Button>
      </div>
    </form>
  );
};

export default ScheduleChangeForm;
