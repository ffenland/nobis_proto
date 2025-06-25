// app/manager/centers/OpeningHoursForm.tsx

"use client";

import React from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { ICenterForm } from "./new/actions";

interface OpeningHoursFormProps {
  register: UseFormRegister<ICenterForm>;
  watch: UseFormWatch<ICenterForm>;
  setValue: UseFormSetValue<ICenterForm>;
}

const WEEK_DAYS = [
  { key: "MON", label: "월요일" },
  { key: "TUE", label: "화요일" },
  { key: "WED", label: "수요일" },
  { key: "THU", label: "목요일" },
  { key: "FRI", label: "금요일" },
  { key: "SAT", label: "토요일" },
  { key: "SUN", label: "일요일" }, // 일요일 추가
] as const;

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // 6시부터 시작
  const minute = i % 2 === 0 ? "00" : "30";
  if (hour >= 24) return null;
  const timeValue = hour * 100 + (minute === "30" ? 30 : 0);
  const displayTime = `${hour.toString().padStart(2, "0")}:${minute}`;
  return { value: timeValue.toString(), label: displayTime };
}).filter(Boolean);

export function OpeningHoursForm({
  register,
  watch,
  setValue,
}: OpeningHoursFormProps) {
  const watchedValues = watch();

  const handleClosedToggle = (dayKey: string, isClosed: boolean) => {
    const closedKey = `${dayKey}_closed` as keyof ICenterForm;
    setValue(closedKey, isClosed);

    if (isClosed) {
      // 휴무일인 경우 시간을 0으로 설정
      setValue(`${dayKey}_open` as keyof ICenterForm, "0");
      setValue(`${dayKey}_close` as keyof ICenterForm, "0");
    } else {
      // 영업일인 경우 기본 시간 설정
      setValue(`${dayKey}_open` as keyof ICenterForm, "900"); // 9:00
      setValue(`${dayKey}_close` as keyof ICenterForm, "2200"); // 22:00
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">영업시간 설정</h3>
      <p className="text-sm text-gray-600">
        모든 요일에 대한 영업시간을 설정해주세요. 휴무일인 경우 "휴무"
        체크박스를 선택하세요.
      </p>

      <div className="space-y-3">
        {WEEK_DAYS.map(({ key, label }) => {
          const openKey = `${key}_open` as keyof ICenterForm;
          const closeKey = `${key}_close` as keyof ICenterForm;
          const closedKey = `${key}_closed` as keyof ICenterForm;
          const isClosed = watchedValues[closedKey];

          return (
            <div
              key={key}
              className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg"
            >
              {/* 요일 */}
              <div className="col-span-2">
                <span className="font-medium">{label}</span>
              </div>

              {/* 휴무 체크박스 */}
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={isClosed || false}
                    onChange={(e) => handleClosedToggle(key, e.target.checked)}
                  />
                  <span className="text-sm">휴무</span>
                </label>
              </div>

              {/* 시작 시간 */}
              <div className="col-span-3">
                <select
                  className={`select select-sm select-bordered w-full ${
                    isClosed ? "opacity-50" : ""
                  }`}
                  disabled={isClosed}
                  {...register(openKey, {
                    required: !isClosed ? "시작 시간을 선택해주세요" : false,
                  })}
                  defaultValue={isClosed ? "0" : "900"}
                >
                  <option value="">시작 시간</option>
                  {TIME_OPTIONS?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ~ */}
              <div className="col-span-1 text-center">
                <span className={isClosed ? "opacity-50" : ""}>~</span>
              </div>

              {/* 종료 시간 */}
              <div className="col-span-3">
                <select
                  className={`select select-sm select-bordered w-full ${
                    isClosed ? "opacity-50" : ""
                  }`}
                  disabled={isClosed}
                  {...register(closeKey, {
                    required: !isClosed ? "종료 시간을 선택해주세요" : false,
                  })}
                  defaultValue={isClosed ? "0" : "2200"}
                >
                  <option value="">종료 시간</option>
                  {TIME_OPTIONS?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 상태 표시 */}
              <div className="col-span-1">
                {isClosed ? (
                  <span className="text-red-500 text-sm">휴무</span>
                ) : (
                  <span className="text-green-500 text-sm">영업</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 일괄 설정 버튼 */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => {
            WEEK_DAYS.forEach(({ key }) => {
              if (key !== "SUN") {
                // 일요일 제외하고 평일 영업시간 설정
                setValue(`${key}_open` as keyof ICenterForm, "900");
                setValue(`${key}_close` as keyof ICenterForm, "2200");
                setValue(`${key}_closed` as keyof ICenterForm, false);
              }
            });
            // 일요일은 휴무로 설정
            setValue("SUN_closed", true);
            setValue("SUN_open", "0");
            setValue("SUN_close", "0");
          }}
        >
          평일 일괄설정 (9:00~22:00, 일요일 휴무)
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => {
            WEEK_DAYS.forEach(({ key }) => {
              setValue(`${key}_open` as keyof ICenterForm, "900");
              setValue(`${key}_close` as keyof ICenterForm, "2200");
              setValue(`${key}_closed` as keyof ICenterForm, false);
            });
          }}
        >
          연중무휴 설정 (9:00~22:00)
        </button>
      </div>
    </div>
  );
}
