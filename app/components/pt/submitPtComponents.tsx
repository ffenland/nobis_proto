import {
  addThirtyMinutes,
  displayTime,
  formatNumberWithCommas,
  getStartEndTime,
} from "@/app/lib/utils";

import Image from "next/image";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { weekDayNumberStringMap } from "@/app/lib/constants";
import { DaySchedule } from "@/app/lib/schedule";
import {
  get3MonthTrainerSchedule,
  IPtProduct,
} from "@/app/member/pt/register/actions";
import {
  ITrainer,
  ITrainer3MSchedule,
} from "@/app/member/pt/\bnew_old/actions";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale("ko");

// choose new pt program
export const PtSelector = ({
  ptProducts,
  onPtProdcutClick,
}: {
  ptProducts: IPtProduct[];
  onPtProdcutClick: (ptId: string) => void;
}) => {
  return (
    <div className="flex flex-col items-center">
      <span className="">원하는 PT프로그램을 선택해주세요.</span>
      <div className="flex w-full flex-col gap-2 px-2">
        {ptProducts.map((pt) => {
          return (
            <PtProduct
              key={pt.id}
              pt={pt}
              onClick={() => {
                onPtProdcutClick(pt.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const PtProduct = ({
  pt,
  onClick,
}: {
  pt: IPtProduct;
  onClick: (id: string) => void;
}) => {
  return (
    <div
      className={`box-border flex w-full cursor-pointer flex-col rounded-md border p-2`}
      onClick={() => onClick(pt.id)}
    >
      <div className="TITLE">
        <span className="font-bold">{pt.title}</span>
      </div>
      <div className="PRICECOUNT flex justify-between">
        <div className="TIME">
          <span>1회 {pt.time}시간</span>
        </div>
        <div className="COUNT_PRICE flex gap-5">
          <div className="COUNT">
            <span>{pt.totalCount}회</span>
          </div>
          <div className="PRICE">
            <span>{formatNumberWithCommas(pt.price)}원</span>
          </div>
        </div>
      </div>
      <div className="DESCRIPTION">
        <p className="">{pt.description}</p>
      </div>
    </div>
  );
};

export const TrainerCard = ({
  trainer,
  onTrainerClick,
}: {
  trainer: ITrainer;
  onTrainerClick?: (trainerId: string) => void;
}) => {
  return (
    <div
      id={trainer.id}
      className="w-full rounded-md border p-2 shadow-md"
      {...(onTrainerClick && {
        onClick: () => {
          onTrainerClick(trainer.id);
        },
      })}
    >
      <div className="AVATAR_NAME flex items-center justify-start gap-4">
        <Image
          src={"/images/logos/nobis_logo_a.png"}
          alt={"Logo"}
          width={45}
          height={45}
        />
        <div>{trainer.user.username}</div>
      </div>
      <div className="INTRODUCE">
        <p>{trainer.introduce}</p>
      </div>
    </div>
  );
};

// Schedule Selector를 위한 도구들 달력 그릴때 쓰자.

const getDaysOfWeek = (currentDay: dayjs.Dayjs) => {
  // currentWeek의 일요일부터 토요일까지의 dayjs 객체를 반환
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(currentDay.day(i));
  }
  return days;
};

const getTimeSlots = ({
  openTime,
  closeTime,
}: {
  openTime: number;
  closeTime: number;
}) => {
  // 시작 시간들의 모임을 반환
  const slots = [];
  // 30분 단위로 나누기 위해 2를 곱함 (ex. 6:00 ~ 10:00 = 4시간 = 8개의 30분 단위)
  // max의 분값이 min의 분값과 같으면 0, 크면 1, 작으면 -1 단위씩 더해준다.

  for (let time = openTime; time < closeTime; time = addThirtyMinutes(time)) {
    slots.push(time);
  }
  return slots;
};

const getTimeLength = ({
  startTime,
  openTime,
  closeTime,
  duration = 1,
}: {
  startTime: number;
  openTime: number;
  closeTime: number;
  duration?: number;
}) => {
  // duration에 따른 시간 구간(30분단위)을 획득한다.
  const timeLength: number[] = [];
  let currentTime = startTime;

  for (let i = 0; i < Math.floor(duration / 0.5); i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break; // 조건을 만족하지 않으면 루프를 종료합니다.
    }
    timeLength.push(currentTime);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeLength; // 항상 timeLength를 반환합니다.
};

export const PtScheduleSelector = ({
  trainerId,
  howmany,
  isRegular,
  duration,
  chosenSchedule,
  setChosenSchedule,
  openTime = 600,
  closeTime = 2200,
}: {
  trainerId: string;
  howmany: number;
  isRegular: boolean;
  duration: number;
  chosenSchedule: DaySchedule;
  setChosenSchedule: Dispatch<SetStateAction<DaySchedule>>;
  openTime?: number;
  closeTime?: number;
}) => {
  const trainerSchedule = useRef<DaySchedule>({});
  const today = useRef(dayjs());
  const [currentWeek, setCurrentWeek] = useState(today.current);
  const [timeError, setTimeError] = useState<string>();

  const timeslot = getTimeSlots({ openTime, closeTime });

  const onTimeClick = (date: dayjs.Dayjs, time: number) => {
    // 이미 최대 날짜를 선택한 경우 캔슬

    if (isRegular && Object.keys(chosenSchedule).length === howmany) return;
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
      trainerSchedule.current[dateKey]
        ? trainerSchedule.current[dateKey].includes(tl)
        : false
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
      isRegular && Object.keys(chosenSchedule).length > 0
        ? dayjs(Object.keys(chosenSchedule).sort()[0]).startOf("week")
        : today.current.startOf("week");

    const newWeek = currentWeek.subtract(1, "week");

    if (newWeek.isSameOrAfter(minAllowedDate, "week")) {
      setCurrentWeek(newWeek);
    }
  };

  const handleNextWeek = () => {
    let maxAllowedDate = today.current.add(12, "weeks").endOf("week");
    if (isRegular && Object.keys(chosenSchedule).length > 0) {
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
    const setTrainerSchedule = async () => {
      const schedule = await get3MonthTrainerSchedule({
        trainerId,
        targetDate: new Date(),
      });
      trainerSchedule.current = schedule;
    };
    setTrainerSchedule();
  }, [trainerId]);
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
      {!isRegular ? (
        <div className="flex flex-col">
          <span>최소 2개의 날짜를 선택해주세요.</span>
          <span>그 이후의 일정은 나중에 선택할 수 있습니다.</span>
        </div>
      ) : null}
      <div className="WeekGrid flex">
        {getDaysOfWeek(currentWeek).map((day) => {
          //요일별로 행을 만들자
          const weekday = day.weekday() as keyof typeof weekDayNumberStringMap;

          // 이미 예약된 시간대
          const occupiedTime =
            trainerSchedule.current[day.format("YYYY-MM-DD")] ?? [];
          // 유저가 선택한 시간대
          const chosenTime = chosenSchedule[day.format("YYYY-MM-DD")] ?? [];
          // 선택할 수 없는 경우
          const cannotChoose =
            isRegular && Object.keys(chosenSchedule).length > 0
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

export const PtScheduleChooseDayTime = ({
  trainerSchedule,
  howmany,
  chosenSchedule,
  setChosenSchedule,
  isRegular,
  duration,
}: {
  trainerSchedule: ITrainer3MSchedule;
  howmany: number;
  chosenSchedule: DaySchedule;
  setChosenSchedule: Dispatch<SetStateAction<DaySchedule>>;
  isRegular: boolean;
  duration: number;
}) => {
  // 아침 6시부터 저녁 10시까지의 시간대를 반환 (30분 단위)
  const minTime = 600;
  const maxTime = 2200;
  const today = useRef(dayjs());
  const [currentWeek, setCurrentWeek] = useState(today.current);
  const [timeError, setTimeError] = useState<string>();

  const getDaysOfWeek = () => {
    // currentWeek의 일요일부터 토요일까지의 dayjs 객체를 반환
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(currentWeek.day(i));
    }
    return days;
  };

  const getTimeSlots = ({ min, max }: { min: number; max: number }) => {
    // 시작 시간들의 모임을 반환
    const slots = [];
    // 30분 단위로 나누기 위해 2를 곱함 (ex. 6:00 ~ 10:00 = 4시간 = 8개의 30분 단위)
    // max의 분값이 min의 분값과 같으면 0, 크면 1, 작으면 -1 단위씩 더해준다.

    for (let time = min; time < max; time = addThirtyMinutes(time)) {
      slots.push(time);
    }
    return slots;
  };

  const getTimeLength = ({
    startTime,
    maxTime,
    duration = 1,
  }: {
    startTime: number;
    maxTime: number;
    duration?: number;
  }): number[] | false => {
    // duration에 따른 시간 구간(30분단위)을 획득한다.
    const timeLength: number[] = [];
    let currentTime = startTime;
    for (let i = 0; i < Math.floor(duration / 0.5); i++) {
      if (currentTime >= maxTime || currentTime < minTime) return false;
      timeLength.push(currentTime);
      currentTime = addThirtyMinutes(currentTime);
    }
    return timeLength;
  };

  const onTimeClick = (date: dayjs.Dayjs, time: number) => {
    // 이미 최대 날짜를 선택한 경우 캔슬

    if (isRegular && Object.keys(chosenSchedule).length === howmany) return;
    setTimeError(undefined);

    const timeLength = getTimeLength({
      startTime: time,
      maxTime,
      duration: duration,
    });
    if (timeLength === false || timeLength.length === 0) {
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
      isRegular && Object.keys(chosenSchedule).length > 0
        ? dayjs(Object.keys(chosenSchedule).sort()[0]).startOf("week")
        : today.current.startOf("week");

    const newWeek = currentWeek.subtract(1, "week");

    if (newWeek.isSameOrAfter(minAllowedDate, "week")) {
      setCurrentWeek(newWeek);
    }
  };

  const handleNextWeek = () => {
    let maxAllowedDate = today.current.add(12, "weeks").endOf("week");
    if (isRegular && Object.keys(chosenSchedule).length > 0) {
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

  const timeslot = getTimeSlots({ min: minTime, max: maxTime });

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
      {!isRegular ? (
        <div className="flex flex-col">
          <span>최소 2개의 날짜를 선택해주세요.</span>
          <span>그 이후의 일정은 나중에 선택할 수 있습니다.</span>
        </div>
      ) : null}
      <div className="WeekGrid flex">
        {getDaysOfWeek().map((day) => {
          //요일별로 행을 만들자
          const weekday = day.weekday() as keyof typeof weekDayNumberStringMap;

          // 이미 예약된 시간대
          const occupiedTime = trainerSchedule[day.format("YYYY-MM-DD")] ?? [];
          // 유저가 선택한 시간대
          const chosenTime = chosenSchedule[day.format("YYYY-MM-DD")] ?? [];
          // 선택할 수 없는 경우
          const cannotChoose =
            isRegular && Object.keys(chosenSchedule).length > 0
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

export const PtConfirmModal = ({
  ptName,
  chosenCenterTrainer,
  chosenSchedule,
  isRegular,
  howmany,
  onReset,
  onConfirm,
  isPending,
}: {
  ptName?: string;
  chosenCenterTrainer: { centerId: string; trainerId: string };
  chosenSchedule: DaySchedule;
  isRegular: boolean;
  howmany?: number;
  onReset: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) => {
  const sortedKeys = Object.keys(chosenSchedule).sort((a, b) => {
    if (isRegular) {
      return dayjs(a).day() - dayjs(b).day();
    } else {
      return a.localeCompare(b);
    }
  });
  const firstDay = dayjs(sortedKeys[0]);
  const { startAt: firstDayStartAt, endAt: firstDayEndAt } = getStartEndTime(
    chosenSchedule[sortedKeys[0]]
  );
  const secondDay = sortedKeys[1] ? dayjs(sortedKeys[1]) : null;
  const { startAt: secondDayStartAt, endAt: secondDayEndAt } = secondDay
    ? getStartEndTime(chosenSchedule[sortedKeys[1]])
    : { startAt: 0, endAt: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-2 flex w-full flex-col gap-3 rounded-md border-2 border-green-600 bg-white p-5">
        <div className="flex w-full items-stretch justify-between">
          <div className="grid grid-cols-2">
            <div className="flex items-center">
              <span className="text-gray-500">PT 프로그램</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-lg font-bold">{ptName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">트레이너</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-lg font-bold">{trainerName}</span>
            </div>
          </div>
        </div>
        {isRegular ? (
          <div className="REGULAR flex flex-col">
            <div className="HOWMANY mb-2 flex items-center justify-center border-b-2">
              주 {howmany}회 정규일정
            </div>
            {sortedKeys.map((key) => {
              const sortedSchedule = chosenSchedule[key].sort();
              const startTime = sortedSchedule[0];
              const endTime = addThirtyMinutes(
                sortedSchedule[sortedSchedule.length - 1]
              );
              const dayjsObj = dayjs(key);
              const weekDay = weekDayNumberStringMap[dayjsObj.day()].kor.long;
              return (
                <div key={key} className="flex justify-between">
                  <span>{weekDay}</span>
                  <span className="font-bold">
                    {displayTime(startTime)} ~ {displayTime(endTime)}
                  </span>
                </div>
              );
            })}
            <div className="First mt-3 flex w-full flex-col rounded-md border border-transparent bg-gray-100 p-3">
              <span className="text-gray-500">첫 수업일</span>
              <span>{firstDay.format("YYYY년 M월 D일")}</span>
              <span className="font-bold">
                {displayTime(firstDayStartAt)} ~ {displayTime(firstDayEndAt)}
              </span>
            </div>
          </div>
        ) : (
          <div className="IRREGULAR flex flex-col gap-2">
            <div className="flex justify-center gap-2">
              <div className="First flex flex-1 flex-col rounded-md border bg-blue-100 p-3">
                <span className="font-bold text-gray-500">첫째날</span>
                <span>{firstDay.format("YYYY년 M월 D일")}</span>
                <span className="font-bold">
                  {displayTime(firstDayStartAt)} ~ {displayTime(firstDayEndAt)}
                </span>
              </div>
              {secondDay && (
                <div className="Seccond flex flex-1 flex-col rounded-md border bg-blue-100 p-3">
                  <span className="font-bold text-gray-500">둘째날</span>
                  <span>{secondDay.format("YYYY년 M월 D일")}</span>
                  <span className="font-bold">
                    {displayTime(secondDayStartAt)} ~
                    {displayTime(secondDayEndAt)}
                  </span>
                </div>
              )}
            </div>
            <div className="INFO flex items-center justify-center rounded-md border bg-gray-200 p-2">
              이후 일정은 결제승인 완료 후 지정하실 수 있습니다.
            </div>
          </div>
        )}
        {isPending ? (
          <div className="rounded-md border border-transparent shadow-md">
            스케줄 계산중...
          </div>
        ) : (
          <div className="BUTTONS flex justify-between gap-2">
            <button
              className="btn btn-success"
              onClick={() => {
                onConfirm();
              }}
            >
              네! 맞아요
            </button>
            <button
              className="btn btn-warning"
              onClick={() => {
                onReset();
              }}
            >
              다시 선택할래요
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PtChosenSummary = ({
  onReset,
  checkedSchedule,
  onConfirm,
}: {
  onReset: () => void;
  checkedSchedule: CheckedSchedule;
  onConfirm: () => void;
}) => {
  const thisYear = dayjs().year();
  return (
    <div className="CHECKEDSCHEDULE">
      <div className="SUCCESS flex w-full flex-col gap-2">
        <span className="font-bold">예약 가능한 일정</span>
        {checkedSchedule.success
          .sort((a, b) => {
            return a.date.getTime() - b.date.getTime();
          })
          .map((item) => {
            const year =
              item.date.getFullYear() === thisYear
                ? null
                : item.date.getFullYear();
            const month = item.date.getMonth() + 1;
            const date = item.date.getDate();
            const day = item.date.getDay();
            return (
              <div
                key={item.date.toISOString()}
                className="mx-2 flex gap-3 rounded-md border p-2"
              >
                <div className="min-w-16">
                  <span>
                    {year ? `${year}년 ` : ""}
                    {month}월 {date}일{" "}
                  </span>
                </div>
                <span
                  className={`${
                    weekDayNumberStringMap[
                      day as keyof typeof weekDayNumberStringMap
                    ].color
                  }`}
                >
                  {
                    weekDayNumberStringMap[
                      day as keyof typeof weekDayNumberStringMap
                    ].kor.long
                  }
                </span>
                <div className="flex min-w-28 justify-end">
                  <span>
                    {displayTime(item.startTime)} ~ {displayTime(item.endTime)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      <div className="Fail flex w-full flex-col gap-2">
        <span className="font-bold">불가능한 일정</span>
        <div className="rounded-md border bg-gray-100 p-2 shadow-md">
          <p className="mx-2">
            자동으로 예약되지 않은 일정은 마이페이지에서 새로 잡으실 수
            있습니다.
          </p>
        </div>
        {checkedSchedule.fail
          .sort((a, b) => {
            return a.date.getTime() - b.date.getTime();
          })
          .map((item) => {
            const year =
              item.date.getFullYear() === thisYear
                ? null
                : item.date.getFullYear();
            const month = item.date.getMonth() + 1;
            const date = item.date.getDate();
            const day = item.date.getDay();
            return (
              <div
                key={item.date.toISOString()}
                className="mx-2 flex gap-3 rounded-md border p-2 line-through"
              >
                <div className="min-w-16">
                  <span>
                    {year ? `${year}년 ` : ""}
                    {month}월 {date}일{" "}
                  </span>
                </div>
                <span className={``}>
                  {
                    weekDayNumberStringMap[
                      day as keyof typeof weekDayNumberStringMap
                    ].kor.long
                  }
                </span>
                <div className="flex min-w-28 justify-end">
                  <span>
                    {displayTime(item.startTime)} ~ {displayTime(item.endTime)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
      <div className="my-3 flex items-center justify-between gap-3">
        <button
          onClick={onReset}
          className="btn btn-accent btn-lg flex-1 text-accent-content"
        >
          다시 선택하기
        </button>
        <button
          className="btn btn-success btn-lg flex-1 text-success-content"
          onClick={onConfirm}
        >
          신청하기
        </button>
      </div>
    </div>
  );
};
