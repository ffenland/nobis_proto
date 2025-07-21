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
  ptId: string;
}

const ScheduleChangeForm = ({ 
  ptRecordId, 
  currentSchedule, 
  ptId 
}: ScheduleChangeFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedDate: new Date(currentSchedule.date).toISOString().split('T')[0],
    startHour: Math.floor(currentSchedule.startTime / 100),
    startMinute: currentSchedule.startTime % 100,
    endHour: Math.floor(currentSchedule.endTime / 100),
    endMinute: currentSchedule.endTime % 100,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestedStartTime = formData.startHour * 100 + formData.startMinute;
      const requestedEndTime = formData.endHour * 100 + formData.endMinute;

      // 시간 유효성 검사
      if (requestedStartTime >= requestedEndTime) {
        alert("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
      }

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
      alert(error instanceof Error ? error.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        options.push({ hour, minute });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

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
          onChange={(e) => setFormData(prev => ({ ...prev, requestedDate: e.target.value }))}
          min={new Date().toISOString().split('T')[0]}
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
          <div className="flex gap-2">
            <select
              value={formData.startHour}
              onChange={(e) => setFormData(prev => ({ ...prev, startHour: Number(e.target.value) }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {timeOptions.map(({ hour, minute }) => (
                <option key={`start-${hour}-${minute}`} value={hour}>
                  {hour.toString().padStart(2, '0')}시
                </option>
              ))}
            </select>
            <select
              value={formData.startMinute}
              onChange={(e) => setFormData(prev => ({ ...prev, startMinute: Number(e.target.value) }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={0}>00분</option>
              <option value={30}>30분</option>
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4" />
            종료 시간
          </label>
          <div className="flex gap-2">
            <select
              value={formData.endHour}
              onChange={(e) => setFormData(prev => ({ ...prev, endHour: Number(e.target.value) }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {timeOptions.map(({ hour, minute }) => (
                <option key={`end-${hour}-${minute}`} value={hour}>
                  {hour.toString().padStart(2, '0')}시
                </option>
              ))}
            </select>
            <select
              value={formData.endMinute}
              onChange={(e) => setFormData(prev => ({ ...prev, endMinute: Number(e.target.value) }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={0}>00분</option>
              <option value={30}>30분</option>
            </select>
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
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
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