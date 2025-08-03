"use client";

import { useState } from "react";
import {
  addTrainerOff,
  removeTrainerOff,
  updateTrainerOff,
  AddTrainerOffData,
} from "@/app/trainer/profile/actions";
import { WeekDay } from "@prisma/client";

interface TrainerOff {
  id: string;
  weekDay: WeekDay | null;
  date: Date | null;
  startTime: number;
  endTime: number;
}

interface TrainerOffManagerProps {
  userId: string;
  trainerOffs: TrainerOff[];
  onOffsChange: () => void;
}

export function TrainerOffManager({
  userId,
  trainerOffs,
  onOffsChange,
}: TrainerOffManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false); // 휴무 등록 모드
  const [editingOffId, setEditingOffId] = useState<string | null>(null); // 휴무 수정 모드
  const [weekDay, setWeekDay] = useState<WeekDay | "">(""); // 요일
  const [date, setDate] = useState<string>(""); // 날짜
  const [startTime, setStartTime] = useState(""); // 시작 시간
  const [endTime, setEndTime] = useState(""); // 종료 시간
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<
    Array<{
      memberName: string;
      date: string;
      startTime: number;
      endTime: number;
    }>
  >([]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(
        <option
          key={`${hour}:00`}
          value={`${hour.toString().padStart(2, "0")}:00`}
        >
          {`${hour.toString().padStart(2, "0")}:00`}
        </option>,
        <option
          key={`${hour}:30`}
          value={`${hour.toString().padStart(2, "0")}:30`}
        >
          {`${hour.toString().padStart(2, "0")}:30`}
        </option>
      );
    }
    return options;
  };

  const validateTimeRange = (start: string, end: string) => {
    if (!start || !end) return true;
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    return startTotal < endTotal;
  };

  const handleTimeChange = (
    time: string,
    isStart: boolean,
    setTime: (time: string) => void
  ) => {
    setTime(time);

    // 시작 시간이 변경된 경우
    if (isStart && endTime) {
      if (!validateTimeRange(time, endTime)) {
        alert("시작 시간은 종료 시간보다 이전이어야 합니다.");
        setTime("");
      }
    }
    // 종료 시간이 변경된 경우
    else if (!isStart && startTime) {
      if (!validateTimeRange(startTime, time)) {
        alert("종료 시간은 시작 시간보다 이후여야 합니다.");
        setTime("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekDay && !date) {
      alert("요일 또는 날짜 중 하나를 선택해주세요");
      return;
    }
    if (!startTime || !endTime) {
      alert("시작 시간과 종료 시간을 입력해주세요");
      return;
    }

    try {
      setIsLoading(true);
      const data: AddTrainerOffData = {
        weekDay: weekDay || "",
        date: date || "",
        startTime: parseInt(startTime.replace(":", "")),
        endTime: parseInt(endTime.replace(":", "")),
      };

      let result;
      if (editingOffId) {
        result = await updateTrainerOff(editingOffId, data);
      } else {
        result = await addTrainerOff(userId, data);
      }

      if (!result.ok && result.error) {
        if (result.error.conflicts) {
          setConflicts(result.error.conflicts);
          setShowConflictModal(true);
          return;
        } else {
          alert(result.error.message);
          return;
        }
      }

      onOffsChange();
      resetForm();
      alert(editingOffId ? "휴무가 수정되었습니다." : "휴무가 등록되었습니다.");
    } catch {
      alert(
        editingOffId ? "휴무 수정에 실패했습니다." : "휴무 등록에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (off: TrainerOff) => {
    // 수정을 누른경우 state에 값을 집어넣는다
    setEditingOffId(off.id);
    setWeekDay(off.weekDay || "");
    setDate(off.date ? new Date(off.date).toISOString().split("T")[0] : "");
    setStartTime(formatTime(off.startTime));
    setEndTime(formatTime(off.endTime));
    setIsAdding(true);
  };

  const handleDelete = async (offId: string) => {
    if (!confirm("휴무를 삭제하시겠습니까?")) return;

    try {
      setIsLoading(true);
      await removeTrainerOff(offId);
      onOffsChange();
      alert("휴무가 삭제되었습니다.");
    } catch {
      alert("휴무 삭제에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingOffId(null);
    setWeekDay("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {!isAdding ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">등록된 휴무</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsAdding(true)}
            >
              휴무 등록
            </button>
          </div>

          {trainerOffs.length === 0 ? (
            <p className="text-gray-500">등록된 휴무가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>시간</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {trainerOffs.map((off) => (
                    <tr key={off.id}>
                      <td>{off.weekDay || formatDate(off.date)}</td>
                      <td>
                        {formatTime(off.startTime)} - {formatTime(off.endTime)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm"
                            onClick={() => handleEdit(off)}
                          >
                            수정
                          </button>
                          <button
                            className="btn btn-sm btn-error"
                            onClick={() => handleDelete(off.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {editingOffId ? "휴무 수정" : "휴무 등록"}
            </h3>
            <button className="btn btn-sm" onClick={resetForm}>
              취소
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">요일 선택</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={weekDay}
                  onChange={(e) => {
                    setWeekDay(e.target.value as WeekDay);
                    setDate("");
                  }}
                >
                  <option value="">요일 선택</option>
                  {Object.values(WeekDay).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">날짜 선택</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setWeekDay("");
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작 시간</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={startTime}
                  onChange={(e) =>
                    handleTimeChange(e.target.value, true, setStartTime)
                  }
                  required
                >
                  <option value="">시작 시간 선택</option>
                  {generateTimeOptions()}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료 시간</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={endTime}
                  onChange={(e) =>
                    handleTimeChange(e.target.value, false, setEndTime)
                  }
                  required
                >
                  <option value="">종료 시간 선택</option>
                  {generateTimeOptions()}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? "저장 중..."
                : editingOffId
                ? "수정하기"
                : "등록하기"}
            </button>
          </form>
        </div>
      )}

      {/* 겹치는 일정 모달 */}
      <dialog
        id="conflict_modal"
        className={`modal ${showConflictModal ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <span className="text-error">
            이미 약속된 PT 일정이 있어 휴무를 등록할 수 없습니다.
          </span>
          <h3 className="font-bold text-lg mb-4">예약된 PT 일정</h3>
          <div className="space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={index} className="p-3 bg-base-200 rounded-lg">
                <p className="font-medium">{conflict.memberName}님의 PT 일정</p>
                <p className="text-sm">
                  {conflict.date} {formatTime(conflict.startTime)} -{" "}
                  {formatTime(conflict.endTime)}
                </p>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <button className="btn" onClick={() => setShowConflictModal(false)}>
              확인
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowConflictModal(false)}>닫기</button>
        </form>
      </dialog>
    </div>
  );
}
