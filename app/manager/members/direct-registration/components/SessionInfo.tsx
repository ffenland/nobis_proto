"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";

interface SessionInfoProps {
  initialData: {
    totalCount: number;
    time: number;
  };
  onSubmit: (data: { totalCount: number; time: number }) => void;
  onBack: () => void;
}

export default function SessionInfo({ initialData, onSubmit, onBack }: SessionInfoProps) {
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [time, setTime] = useState(initialData.time);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalCount < 1) {
      alert("남은 수업 횟수는 1회 이상이어야 합니다.");
      return;
    }
    
    if (time < 30 || time % 30 !== 0) {
      alert("수업 시간은 30분 단위로 입력해주세요.");
      return;
    }
    
    onSubmit({ totalCount, time });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          이전 단계
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">수업 정보 입력</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              남은 수업 횟수
            </label>
            <input
              type="number"
              value={totalCount}
              onChange={(e) => setTotalCount(Number(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-600">
              현재 남아있는 유효한 수업 횟수를 입력하세요.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수업 시간 (분)
            </label>
            <select
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30분</option>
              <option value={60}>60분 (1시간)</option>
              <option value={90}>90분 (1시간 30분)</option>
              <option value={120}>120분 (2시간)</option>
            </select>
            <p className="mt-1 text-sm text-gray-600">
              기존 수업의 1회 진행 시간을 선택하세요.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">입력 정보 확인</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 남은 수업 횟수: {totalCount}회</li>
              <li>• 1회 수업 시간: {time}분</li>
              <li>• 다음 단계에서 {totalCount}개 이하의 날짜를 선택하게 됩니다.</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            다음 단계
          </button>
        </form>
      </div>
    </div>
  );
}