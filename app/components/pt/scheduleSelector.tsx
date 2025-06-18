import {
  DaySchedule,
  getDaysOfWeek,
  getTimeLength,
  getTimeSlots,
} from "@/app/lib/schedule";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { weekDayNumberStringMap } from "@/app/lib/constants";
import { displayTime, formatDate } from "@/app/lib/utils";
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale("ko");

export const ScheduleSelector = ({
  trainerSchedule,
  pattern,
  duration,
  chosenSchedule,
  setChosenSchedule,
  openTime = 600,
  closeTime = 2200,
}: {
  trainerSchedule: DaySchedule;
  pattern: {
    regular: boolean;
    howmany: number;
  };
  duration: number; // 단위=시간
  chosenSchedule: DaySchedule;
  setChosenSchedule: Dispatch<SetStateAction<DaySchedule>>;
  openTime?: number;
  closeTime?: number;
}) => {
  const today = useRef(dayjs());
  const [currentWeek, setCurrentWeek] = useState(today.current);
  const [timeError, setTimeError] = useState<string>();

  const timeslot = getTimeSlots({ openTime, closeTime });

  const onTimeClick = (date: dayjs.Dayjs, time: number) => {
    // 이미 최대 날짜를 선택한 경우 캔슬

    if (
      pattern.regular &&
      Object.keys(chosenSchedule).length === pattern.howmany
    )
      return;
    setTimeError(undefined);

    const timeLength = getTimeLength({
      startTime: time,
      openTime,
      closeTime,
      duration: duration,
    });
    if (timeLength.length === 0) {
      setTimeError("해당 시간은 선택할 수 없습니다.");
      return;
    }

    // check timeLength include trainerSchedule,
    const dateKey = date.format("YYYY-MM-DD");
    const impossible = timeLength.some((tl) =>
      trainerSchedule[dateKey] ? trainerSchedule[dateKey].includes(tl) : false
    );
    if (impossible) return;
    const newChosenSchedule = { ...chosenSchedule };
    newChosenSchedule[dateKey] = [...timeLength];
    setChosenSchedule(newChosenSchedule);
  };
  const onChosenTimeClick = (date: dayjs.Dayjs) => {
    const dateKey = date.format("YYYY-MM-DD");
    const newChosenSchedule = { ...chosenSchedule }; // 기존 객체의 복사본 생성
    delete newChosenSchedule[dateKey]; // 해당 날짜의 키 삭제
    setChosenSchedule(newChosenSchedule);
  };
  const handlePrevWeek = () => {
    const minAllowedDate =
      pattern.regular && Object.keys(chosenSchedule).length > 0
        ? dayjs(Object.keys(chosenSchedule).sort()[0]).startOf("week")
        : today.current.startOf("week");

    const newWeek = currentWeek.subtract(1, "week");

    if (newWeek.isSameOrAfter(minAllowedDate, "week")) {
      setCurrentWeek(newWeek);
    }
  };

  const handleNextWeek = () => {
    let maxAllowedDate = today.current.add(12, "weeks").endOf("week");
    if (pattern.regular && Object.keys(chosenSchedule).length > 0) {
      const firstSelectedDate = dayjs(Object.keys(chosenSchedule).sort()[0]);
      maxAllowedDate =
        dayjs(Object.keys(chosenSchedule).sort()[0]).day() === 1
          ? today.current
          : firstSelectedDate.add(1, "week");
    }

    const newWeek = currentWeek.add(1, "week");
    if (
      newWeek.isBefore(maxAllowedDate) ||
      newWeek.isSame(maxAllowedDate, "week")
    ) {
      setCurrentWeek(newWeek);
    }
  };

  useEffect(() => {
    // 현재 날짜가 포함된 주의 월요일로 설정
    const currentDay = today.current;
    const nextMonday =
      currentDay.day() === 0
        ? currentDay.add(1, "day")
        : currentDay.startOf("isoWeek");
    setCurrentWeek(nextMonday);
  }, []);
  return (
    <div className="WeeklySchedule flex w-full flex-col gap-1">
      <div className="navigation flex w-full items-center justify-between">
        <button className="bnt-sm btn" onClick={handlePrevWeek}>
          이전 주
        </button>
        <span>{currentWeek.add(1, "day").format("YYYY년 MM월")}</span>
        <button className="bnt-sm btn" onClick={handleNextWeek}>
          다음 주
        </button>
      </div>
      {timeError ? <div>{timeError}</div> : null}
      {Object.keys(chosenSchedule).length > 0 ? (
        <div className="flex items-center justify-center">
          <span>첫 수업일 : </span>
          <span>{formatDate(new Date(Object.keys(chosenSchedule)[0]))}</span>
        </div>
      ) : !pattern.regular ? (
        <div className="flex flex-col text-sm">
          <span>최소 2개의 날짜를 선택해주세요.</span>
          <span>그 이후의 일정은 나중에 선택할 수 있습니다.</span>
        </div>
      ) : (
        <div className="flex flex-col text-sm">
          <span>우선 처음 수업할 날짜를 선택해 주세요.</span>
          <span>선택한 시간대를 다시 누르면 취소할 수 있습니다.</span>
        </div>
      )}
      <div className="WeekGrid flex">
        {getDaysOfWeek(currentWeek).map((day) => {
          //요일별로 행을 만들자
          const weekday = day.weekday() as keyof typeof weekDayNumberStringMap;

          // 이미 예약된 시간대
          const occupiedTime = trainerSchedule[day.format("YYYY-MM-DD")] ?? [];
          // 유저가 선택한 시간대
          const chosenTime = chosenSchedule[day.format("YYYY-MM-DD")] ?? [];
          // 선택할 수 없는 경우
          const cannotChoose =
            pattern.regular && Object.keys(chosenSchedule).length > 0
              ? day.isBefore(dayjs(Object.keys(chosenSchedule).sort()[0])) || // regular인 경우 처음 선택한 날은 운동 시작일 이므로 그 과거는 선택 불가
                day.isSameOrAfter(
                  dayjs(Object.keys(chosenSchedule).sort()[0]).add(1, "weeks")
                ) // regular인 경우 운동 시작일 이후 일주일 이내만 선택가능
              : false; // false = 선택 가능

          return (
            <div
              key={day.format("YYYY-MM-DD")}
              className={`relative flex flex-1 flex-col rounded-md border`}
            >
              <div>
                <div
                  className={`flex flex-col items-center ${
                    day.day() === 0 ? "invisible" : "" // 일요일은 index로 사용한다.
                  }`}
                >
                  <span
                    className={`text-sm ${
                      weekday === 6 ? "text-blue-500" : "" // 토요일은 파랑색
                    }`}
                  >
                    {weekDayNumberStringMap[weekday].kor.short}
                  </span>
                  <span className="text-xs">{day.date()}일</span>
                </div>
              </div>

              <div className={`TIME flex-1 flex-col`}>
                {timeslot.map((time, index) => {
                  const isOccupied = occupiedTime.includes(time);
                  const isChosen = chosenTime.includes(time);

                  if (day.day() === 0) {
                    return (
                      <div
                        key={time}
                        className="relative flex h-6 items-center justify-between text-sm"
                      >
                        <div className="absolute -top-2 z-20 flex w-2/3 items-center justify-center bg-white">
                          <span>{displayTime(time)}</span>
                        </div>
                        <div className="absolute right-0 top-0 z-10 w-1/3 border-t-2" />
                      </div>
                    );
                  } else {
                    const isPast = day.isBefore(dayjs(), "day");

                    return (
                      <div
                        key={time}
                        className={`flex h-6 flex-1 items-center justify-center border-t text-sm ${
                          isPast ||
                          cannotChoose ||
                          index === timeslot.length - 1 // 마지막 시간대는 border-bottom이 없다.
                            ? "bg-gray-300"
                            : isOccupied
                            ? "bg-rose-300"
                            : isChosen
                            ? "bg-green-300"
                            : ""
                        }`}
                        onClick={() => {
                          if (
                            isPast ||
                            cannotChoose ||
                            index === timeslot.length - 1 ||
                            isOccupied
                          )
                            return;
                          if (isChosen) {
                            onChosenTimeClick(day);
                          } else {
                            onTimeClick(day, time);
                          }
                        }}
                      >
                        {isOccupied ? "예약됨" : ""}
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleSelector;
