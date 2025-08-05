"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, Calendar, X, Clock } from "lucide-react";
import { formatTime, generateTimeSlots, addThirtyMinutes } from "@/app/lib/utils/time.utils";

interface ScheduleData {
  date: Date;
  startTime: number;
  endTime: number;
}

interface DateSelectionProps {
  maxCount: number;
  onSubmit: (schedules: ScheduleData[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function DateSelection({ maxCount, onSubmit, onBack, isLoading }: DateSelectionProps) {
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // duration을 30분 단위로 처리하는 헬퍼 함수
  const addDuration = (time: number, duration: number): number => {
    let result = time;
    const thirtyMinuteSlots = duration / 30;
    for (let i = 0; i < thirtyMinuteSlots; i++) {
      result = addThirtyMinutes(result);
    }
    return result;
  };

  const handleDateClick = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    const existingIndex = selectedSchedules.findIndex(s => s.date.toDateString() === dateStr);
    
    if (existingIndex >= 0) {
      // 이미 선택된 날짜면 제거
      setSelectedSchedules(prev => prev.filter((_, i) => i !== existingIndex));
    } else if (selectedSchedules.length < maxCount) {
      // 시간 선택 모달 표시
      setSelectedDate(date);
      setShowTimeModal(true);
    } else {
      alert(`최대 ${maxCount}개의 날짜만 선택할 수 있습니다.`);
    }
  }, [selectedSchedules, maxCount]);

  const handleTimeSelect = (startTime: number, endTime: number) => {
    if (!selectedDate) return;
    
    setSelectedSchedules(prev => [...prev, {
      date: selectedDate,
      startTime,
      endTime
    }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    
    setShowTimeModal(false);
    setSelectedDate(null);
  };

  const handleSubmit = () => {
    if (selectedSchedules.length < 2) {
      alert("최소 2개 이상의 날짜를 선택해주세요.");
      return;
    }
    
    onSubmit(selectedSchedules);
  };

  const removeSchedule = (index: number) => {
    setSelectedSchedules(prev => prev.filter((_, i) => i !== index));
  };

  // 캘린더 렌더링을 위한 날짜 계산
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const weeks = [];
  const date = new Date(startDate);
  
  while (date <= lastDayOfMonth || date.getDay() !== 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    weeks.push(week);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          disabled={isLoading}
        >
          <ChevronLeft className="w-4 h-4" />
          이전 단계
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">수업 날짜 선택</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            • 최소 2개, 최대 {maxCount}개의 날짜를 선택하세요.
          </p>
          <p className="text-sm text-gray-600">
            • 각 날짜를 클릭하여 원하는 수업 시간을 선택하세요.
          </p>
        </div>

        {/* 캘린더 네비게이션 */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded"
            disabled={isLoading}
          >
            &lt;
          </button>
          <h3 className="text-lg font-medium">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded"
            disabled={isLoading}
          >
            &gt;
          </button>
        </div>

        {/* 캘린더 */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="grid grid-cols-7 bg-gray-50">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-t">
              {week.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isPast = day < today;
                const isSelected = selectedSchedules.some(s => s.date.toDateString() === day.toDateString());
                
                return (
                  <div
                    key={dayIndex}
                    onClick={() => !isPast && isCurrentMonth && !isLoading && handleDateClick(day)}
                    className={`
                      p-4 text-center cursor-pointer transition-colors
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                      ${isPast ? 'text-gray-400 cursor-not-allowed bg-gray-50' : ''}
                      ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                      ${dayIndex === 0 ? 'text-red-600' : ''}
                      ${dayIndex === 6 ? 'text-blue-600' : ''}
                    `}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 선택된 스케줄 목록 */}
        {selectedSchedules.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              선택된 스케줄 ({selectedSchedules.length}/{maxCount})
            </h3>
            <div className="space-y-2">
              {selectedSchedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">
                      {schedule.date.toLocaleDateString('ko-KR')}
                    </span>
                    <Clock className="w-4 h-4 text-blue-600 ml-2" />
                    <span className="text-sm">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSchedule(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={selectedSchedules.length < 2 || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "등록 중..." : "등록 완료"}
        </button>
      </div>

      {/* 시간 선택 모달 */}
      {showTimeModal && selectedDate && (
        <TimeSelectionModal
          date={selectedDate}
          onSelect={handleTimeSelect}
          onClose={() => {
            setShowTimeModal(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}

// 시간 선택 모달 컴포넌트
interface TimeSelectionModalProps {
  date: Date;
  onSelect: (startTime: number, endTime: number) => void;
  onClose: () => void;
}

function TimeSelectionModal({ date, onSelect, onClose }: TimeSelectionModalProps) {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(60); // 기본 60분
  
  // 영업시간 (9:00 - 22:00)
  const timeSlots = generateTimeSlots(900, 2200);
  
  const handleConfirm = () => {
    if (!selectedTime) {
      alert("시작 시간을 선택해주세요.");
      return;
    }
    
    const endTime = addDuration(selectedTime, duration);
    
    // 영업시간 내인지 확인
    if (endTime > 2200) {
      alert("수업이 영업시간(22:00)을 초과합니다.");
      return;
    }
    
    onSelect(selectedTime, endTime);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {date.toLocaleDateString('ko-KR')} 수업 시간 선택
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            수업 시간
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={30}>30분</option>
            <option value={60}>60분</option>
            <option value={90}>90분</option>
            <option value={120}>120분</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            시작 시간
          </label>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
            {timeSlots.map((time) => {
              const endTime = addDuration(time, duration);
              const isDisabled = endTime > 2200;
              
              return (
                <button
                  key={time}
                  onClick={() => !isDisabled && setSelectedTime(time)}
                  disabled={isDisabled}
                  className={`
                    px-3 py-2 text-sm rounded-md transition-colors
                    ${selectedTime === time 
                      ? 'bg-blue-600 text-white' 
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200'
                    }
                  `}
                >
                  {formatTime(time)}
                </button>
              );
            })}
          </div>
        </div>
        
        {selectedTime && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              선택된 시간: {formatTime(selectedTime)} - {formatTime(addDuration(selectedTime, duration))}
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTime}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}