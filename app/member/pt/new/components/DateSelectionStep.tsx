"use client";

import { useState } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { format, addDays, startOfToday } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/app/components/ui/Button";
import { CalendarDays, AlertCircle } from "lucide-react";
import type { 
  FitnessCentersForPtApply,
  TrainersWithPtProgramsByCenter 
} from "@/app/services/member/pt/pt.service";

interface DateSelectionStepProps {
  selectedCenter: FitnessCentersForPtApply[number] | null;
  selectedPt: TrainersWithPtProgramsByCenter[number]["ptProduct"][number] | null;
  selectedTrainer: TrainersWithPtProgramsByCenter[number] | null;
  onNext: (startDate: Date) => void;
}

export default function DateSelectionStep({
  selectedPt,
  onNext,
}: DateSelectionStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // 오늘부터 30일 이내만 선택 가능
  const today = startOfToday();
  const maxDate = addDays(today, 30);

  const handleSubmit = async () => {
    if (!selectedDate) {
      alert("시작일을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 선택한 날짜로 다음 단계 진행
      onNext(selectedDate);
    } catch (error) {
      console.error("날짜 선택 중 오류:", error);
      alert("날짜 선택 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 비활성화할 날짜 조건 함수
  const isDateDisabled = (date: Date) => {
    return date < today || date > maxDate;
  };

  // 기본 클래스명 가져오기
  const defaultClassNames = getDefaultClassNames();

  return (
    <div className="space-y-6">

      {/* 시작일 선택 안내 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          PT 시작일 선택
        </h3>
        <p className="text-sm text-gray-600">
          PT를 시작하실 날짜를 선택해주세요. 오늘부터 30일 이내의 날짜를 선택할 수 있습니다.
        </p>
      </div>

      {/* 달력 */}
      <div className="w-full">
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              console.log('날짜 선택됨:', date);
              setSelectedDate(date);
            }}
            disabled={isDateDisabled}
            locale={ko}
            showOutsideDays={false}
            classNames={{
              root: `${defaultClassNames.root} w-full relative`,
              months: "w-full",
              month: "w-full space-y-4",
              month_caption: "flex justify-center relative items-center mb-4 px-20",
              caption_label: "text-lg font-semibold text-gray-900",
              nav: "flex justify-between w-full absolute top-0 left-0 right-0",
              nav_button: "w-1/4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center",
              nav_button_previous: "absolute left-0 top-0",
              nav_button_next: "absolute right-0 top-0",
              month_grid: "w-full",
              weekdays: "grid grid-cols-7 text-center mb-2",
              weekday: "text-sm font-medium text-gray-600 p-2",
              weeks: "w-full",
              week: "grid grid-cols-7 w-full",
              day: "relative p-0 w-full aspect-square flex items-center justify-center",
              day_button: "w-full h-full rounded-lg border-2 border-transparent hover:bg-gray-100 transition-colors flex items-center justify-center text-base font-medium cursor-pointer",
              selected: "bg-blue-500 text-white hover:bg-blue-600 font-semibold",
              today: "bg-gray-100 font-bold text-gray-900",
              outside: "text-gray-400 opacity-50",
              disabled: "text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent",
              hidden: "invisible",
              range_start: "bg-blue-500 text-white rounded-l-lg",
              range_end: "bg-blue-500 text-white rounded-r-lg",
              range_middle: "bg-blue-100",
              chevron: `${defaultClassNames.chevron} w-5 h-5 fill-gray-600`,
            }}
          />
        </div>
      </div>

      {/* 선택된 날짜 표시 */}
      {selectedDate && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">선택하신 시작일</p>
              <p className="text-lg font-semibold text-gray-900">
                {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                유효기간: {format(selectedDate, "yyyy년 M월 d일")} ~ {format(addDays(selectedDate, selectedPt?.expiration_period || 0), "yyyy년 M월 d일")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-yellow-800 font-medium">
              시작일 선택 안내
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 선택하신 날짜부터 PT가 시작됩니다.</li>
              <li>• 시작일부터 {selectedPt?.expiration_period}일 이내에 모든 수업을 완료해야 합니다.</li>
              <li>• 구체적인 수업 일정은 트레이너님과 협의하여 결정됩니다.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 다음 버튼 */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!selectedDate || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              처리 중...
            </span>
          ) : (
            "다음 단계"
          )}
        </Button>
      </div>
    </div>
  );
}