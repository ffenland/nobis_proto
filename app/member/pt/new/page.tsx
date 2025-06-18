"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  createNewPt,
  get3MonthTrainerSchedule,
  getCenters,
  getPtProductsOfTrainerByCenter,
  ICentersForMember,
  ICheckedSchedule,
  IPtAndTrainer,
  ITrainer,
  trainerScheduleCheck,
} from "./actions";
import { PageHeading, PageSubtitle } from "@/app/components/base/page_text";
import {
  displayTime,
  formatNumberWithCommas,
  formatPhoneNumber,
  getStartEndTime,
} from "@/app/lib/utils";
import {
  createWeekScheduleFromChosenSchedule,
  dayOffTime,
  DaySchedule,
  ISchedule,
  mergeDaySchedules,
} from "@/app/lib/schedule";
import ScheduleSelector from "@/app/components/pt/scheduleSelector";
import dayjs from "dayjs";
import { weekDayNumberStringMap } from "@/app/lib/constants";
import { useRouter } from "next/navigation";

type IChosenTrainerAndPt =
  | (Omit<IPtAndTrainer[number], "trainer"> & { trainer: ITrainer })
  | null;

// 회원 프로그램 신청 페이지
const SubscribePt = () => {
  const router = useRouter();
  const [steps, setSteps] = useState(0);
  const [chosenCenter, setChosenCenter] = useState<
    ICentersForMember[number] | null
  >(null);
  const [chosenTrainerAndPt, setChosenTrainerAndPt] =
    useState<IChosenTrainerAndPt>(null);
  const [pattern, setPattern] = useState<{
    regular: boolean;
    howmany: number;
  } | null>(null);
  const [chosenSchedule, setChosenSchedule] = useState<DaySchedule>({});
  const [checkedSchedule, setCheckedSchedule] = useState<ISchedule[]>();

  const [isPending, setIsPending] = useState(false);
  const onSubmit = async () => {
    if (checkedSchedule && chosenTrainerAndPt && pattern) {
      setIsPending(true);
      const result = await createNewPt({
        ptProductId: chosenTrainerAndPt?.id,
        trainerId: chosenTrainerAndPt?.trainer.id,
        checkedSchedule,
        isRegular: pattern?.regular,
        chosenSchedule,
      });
      if (result.ok) {
        router.replace("/member/pt");
      }
    }
  };

  const stepBack = () => {
    if (steps === 0 && chosenCenter) {
      setChosenCenter(null);
    } else if (steps === 1) {
      setChosenCenter(null);
      setChosenTrainerAndPt(null);
      setPattern(null);
      setChosenSchedule({});
      setCheckedSchedule(undefined);
      setSteps(0);
    } else if (steps === 2) {
      setPattern(null);
      setChosenSchedule({});
      setCheckedSchedule(undefined);
      setSteps(1);
    } else if (steps === 3 || steps === 4) {
      setPattern(null);
      setChosenSchedule({});
      setCheckedSchedule(undefined);
      setSteps(1);
    }
  };
  return (
    <div className="w-full flex flex-col">
      <div className="flex justify-between items-center">
        <span>새로운 PT수업 신청하기</span>
        <div className="btn btn-sm btn-accent" onClick={stepBack}>
          뒤로
        </div>
      </div>
      <ul className="steps text-sm">
        <li className={`step step-primary flex flex-col`}>
          <span>센터 &</span>
          <span>PT</span>
        </li>
        <li className={`step ${steps > 0 ? "step-primary" : ""}`}>
          <span>운동주기</span>
        </li>
        <li className={`step ${steps > 1 ? "step-primary" : ""} flex flex-col`}>
          <span>일정</span>
        </li>
        <li className={`step ${steps > 2 ? "step-primary" : ""}`}>일정확인</li>
        <li className={`step ${steps > 3 ? "step-primary" : ""}`}>확정</li>
      </ul>

      <div className="flex-1 w-full mt-2">
        {steps === 0 && chosenCenter === null && (
          <SelectCenter setChosenCenter={setChosenCenter} />
        )}
        {steps === 0 && chosenCenter && (
          <SelectPtAndTrainer
            centerId={chosenCenter.id}
            setChosenTrainerAndPt={setChosenTrainerAndPt}
            setSteps={setSteps}
          />
        )}
        {steps === 1 && chosenTrainerAndPt && (
          <SelectType setPattern={setPattern} setSteps={setSteps} />
        )}
        {steps === 2 && pattern && chosenTrainerAndPt && (
          <SelectSchedule
            pattern={pattern}
            trainerId={chosenTrainerAndPt.trainer.id}
            chosenSchedule={chosenSchedule}
            setChosenSchedule={setChosenSchedule}
            setSteps={setSteps}
          />
        )}
        {steps === 3 && chosenTrainerAndPt && chosenSchedule && pattern && (
          <ShowTrainerScheduleCheck
            chosenSchedule={chosenSchedule}
            trainerId={chosenTrainerAndPt.trainer.id}
            pattern={pattern}
            totalCount={chosenTrainerAndPt.totalCount}
            setSteps={setSteps}
            setCheckedSchedule={setCheckedSchedule}
          />
        )}
        {steps === 4 &&
          chosenCenter &&
          chosenTrainerAndPt &&
          checkedSchedule &&
          pattern && (
            <ShowSummary
              chosenCenter={chosenCenter}
              chosenSchedule={chosenSchedule}
              checkedSchedule={checkedSchedule}
              chosenTrainerAndPt={chosenTrainerAndPt}
              pattern={pattern}
              isPending={isPending}
              onSubmit={onSubmit}
            />
          )}
      </div>
    </div>
  );
};

const SelectCenter = ({
  setChosenCenter,
}: {
  setChosenCenter: Dispatch<SetStateAction<ICentersForMember[number] | null>>;
}) => {
  const [centers, setCenters] = useState<ICentersForMember>([]);
  useEffect(() => {
    const initCenters = async () => {
      const dbCenters = await getCenters();
      setCenters(dbCenters);
    };
    initCenters();
  }, []);
  return (
    <div className="w-full flex flex-col">
      <div className="INFO flex flex-col">
        <span>운동을 하실 센터를 선택해주세요.</span>
        <span>어느 곳에서 등록하셔도 모든 센터를 이용하실 수 있습니다.</span>
      </div>
      <div className="CENTERS grid grid-cols-3 gap-2">
        {centers.map((center) => (
          <div
            key={center.id}
            className="flex-1 w-full flex flex-col center p-2 border rounded-md shadow-md"
            onClick={() => {
              setChosenCenter(center);
            }}
          >
            <div className="flex justify-center items-center">
              <PageHeading text={center.title} />
            </div>
            <span>{center.address}</span>
            <span className="text-sm">{formatPhoneNumber(center.phone)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SelectPtAndTrainer = ({
  centerId,
  setChosenTrainerAndPt,
  setSteps,
}: {
  centerId: string;
  setChosenTrainerAndPt: Dispatch<SetStateAction<IChosenTrainerAndPt>>;
  setSteps: Dispatch<SetStateAction<number>>;
}) => {
  const [ptAndTrainer, setPtAndTrainer] = useState<IPtAndTrainer>([]);
  const [chosenPt, setChosenPt] = useState<IPtAndTrainer[number] | null>(null);

  useEffect(() => {
    const initTrainerAndPt = async () => {
      const dbTrainerAndPt = await getPtProductsOfTrainerByCenter(centerId);
      setPtAndTrainer(dbTrainerAndPt);
    };
    initTrainerAndPt();
  }, [centerId]);
  return (
    <div className="w-full">
      <div className="INFO flex flex-col">
        <span>PT 프로그램을 선택해주세요.</span>
        <span>트레이너 스케줄에 따라 수업가능한 시간이 다를 수 있습니다.</span>
      </div>
      <div className="PTPRODUCT flex flex-col gap-2">
        {chosenPt ? (
          // PT를 선택했을 때
          <div className="border-2 border-gray-400 rounded-md p-2 shadow-md">
            <div className="flex justify-between">
              <div className="flex items-center gap-3">
                <span>선택한 수업 : </span>
                <PageSubtitle text={chosenPt.title} />
              </div>
              <div
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setChosenPt(null);
                }}
              >
                다시 선택하기
              </div>
            </div>
            <div>{chosenPt.description}</div>
            <div>{chosenPt.totalCount}회</div>
            <div>{formatNumberWithCommas(chosenPt.price)}원</div>
            <div className="flex flex-col">
              <span>이제 같이 운동하실 트레이너를 선택해주세요.</span>
              <div className="flex flex-wrap gap-3">
                {chosenPt.trainer.map((trn) => (
                  <div
                    key={trn.id}
                    className="cursor-pointer border p-2 rounded-md shadow-md"
                    onClick={() => {
                      setSteps(1);
                      setChosenTrainerAndPt({
                        ...chosenPt,
                        trainer: trn,
                      });
                    }}
                  >
                    <span>{trn.user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          ptAndTrainer.map((pt) => {
            return (
              <div
                key={pt.id}
                className="cursor-pointer border p-2 rounded-md shadow-md flex flex-col"
                onClick={() => {
                  setChosenPt(pt);
                }}
              >
                <PageSubtitle text={pt.title} />

                <div>{pt.description}</div>
                <div>{formatNumberWithCommas(pt.price)}원</div>
                <div>수업 가능한 트레이너</div>
                <div className="flex gap-3 flex-wrap">
                  {pt.trainer.map((trn) => (
                    <div
                      key={trn.id}
                      className="min-w-24 p-1 border bg-gray-100 rounded-md"
                    >
                      <span>{trn.user.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const SelectType = ({
  setPattern,
  setSteps,
}: {
  setPattern: Dispatch<
    SetStateAction<{
      regular: boolean;
      howmany: number;
    } | null>
  >;
  setSteps: Dispatch<SetStateAction<number>>;
}) => {
  const [regularChosen, setRegularChosen] = useState(false);
  return (
    <div className="flex flex-col">
      {!regularChosen ? (
        <>
          <span>운동 주기를 선택해주세요.</span>
          <div className="flex justify-between gap-2">
            <div
              className="flex-1 flex flex-col border rounded-lg p-2 cursor-pointer"
              onClick={() => {
                setRegularChosen(true);
              }}
            >
              <span className="text-bold text-center">정규 스케줄</span>
              <div className="text-sm">
                <p>
                  요일과 시간을 정해서 매주 같은 요일, 정해진 시간에 수업합니다.
                </p>
                <p>
                  운동이 최적의 효과를 갖기 위해서는 주기적으로 하시는게 제일
                  좋습니다.
                </p>
              </div>
            </div>
            <div
              className="flex-1 flex flex-col border rounded-lg p-2 cursor-pointer"
              onClick={() => {
                setPattern({
                  regular: false,
                  howmany: 2,
                });
                setSteps(2);
              }}
            >
              <span className="text-bold text-center">수시 스케줄</span>
              <div className="text-sm">
                <p>운동일정을 미리 정하지 않고</p>
                <p> 가능한 시간대에 예약해서 잡습니다.</p>
                <p>PT기간 내에 운동횟수를 다 사용하셔야합니다.</p>
                <p>기간이 지난 후에는 사용하실 수 없습니다.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col justify-center items-center">
            <span>일주일에 몇번 운동을 하시나요?</span>
            <span>요일은 다음 단계에서 선택합니다.</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              return (
                <div
                  key={n}
                  className="flex-1 rounded-md border border-sky-900 p-1 flex justify-center items-center"
                  onClick={() => {
                    setPattern({
                      regular: true,
                      howmany: n,
                    });
                    setSteps(2);
                  }}
                >
                  <span className="text-center">주 {n}회</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const SelectSchedule = ({
  pattern,
  trainerId,
  chosenSchedule,
  setChosenSchedule,
  setSteps,
}: {
  pattern: {
    regular: boolean;
    howmany: number;
  };
  trainerId: string;
  chosenSchedule: DaySchedule;
  setChosenSchedule: Dispatch<SetStateAction<DaySchedule>>;
  setSteps: Dispatch<SetStateAction<number>>;
}) => {
  const duration = 1;
  const openTime = 900;
  const closeTime = 2300;
  const [trainerSchedule, setTrainerSchedule] = useState<DaySchedule>({});

  const firstDay =
    Object.keys(chosenSchedule).length > 0
      ? `${Object.keys(chosenSchedule).sort()[0].split("-")[0]}년 ${
          Object.keys(chosenSchedule).sort()[0].split("-")[1]
        }월 ${Object.keys(chosenSchedule).sort()[0].split("-")[2]}일 ${
          weekDayNumberStringMap[
            new Date(
              Object.keys(chosenSchedule).sort()[0]
            ).getDay() as keyof typeof weekDayNumberStringMap
          ].kor.long
        }`
      : "";

  const weekSchedule = createWeekScheduleFromChosenSchedule({
    chosenSchedule,
  });

  useEffect(() => {
    const today = new Date();
    const initSchedule = async () => {
      const trainer3MonthSchedule = await get3MonthTrainerSchedule({
        trainerId,
        targetDate: today,
      });
      setTrainerSchedule(trainer3MonthSchedule);
    };
    initSchedule();
  }, [trainerId]);
  return pattern.howmany !== Object.keys(chosenSchedule).length ? (
    <div>
      <ScheduleSelector
        trainerSchedule={trainerSchedule}
        pattern={pattern}
        duration={duration}
        openTime={openTime}
        closeTime={closeTime}
        chosenSchedule={chosenSchedule}
        setChosenSchedule={setChosenSchedule}
      />
    </div>
  ) : (
    <div className="w-full flex flex-col">
      <div className="SCHEDULE flex flex-col gap-2">
        {pattern.regular ? (
          <div>
            <div>
              <PageSubtitle text={`주 ${pattern.howmany}회 정규 스케줄`} />
            </div>
            <div className="flex flex-col gap-2">
              {weekSchedule.map((daySchedule) => {
                const { endTime, startTime } = daySchedule;
                const weekDayName =
                  weekDayNumberStringMap[daySchedule.day].kor.long;
                return (
                  <div
                    key={daySchedule.day}
                    className="flex items-center rounded-md border p-2 text-sm border-gray-100 shadow-md"
                  >
                    <span className="  font-semibold">
                      매주 {weekDayName} :
                    </span>
                    <span>{`${displayTime(startTime)}`}</span>
                    <span>{`~ ${displayTime(endTime)}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div>
              <PageSubtitle text={`수시 스케줄`} />
              <div className="text-center">
                <span>예약한 일정 {Object.keys(chosenSchedule).length}건</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {Object.keys(chosenSchedule)
                .sort()
                .map((day) => {
                  const { startAt, endAt } = getStartEndTime(
                    chosenSchedule[day]
                  );
                  const dayObj = dayjs(day);
                  const weekDayName =
                    weekDayNumberStringMap[dayObj.day()].kor.long;

                  return (
                    <div
                      key={day}
                      className="flex items-center rounded-md border p-2 text-sm border-gray-100 shadow-md"
                    >
                      <div className="">
                        {`${dayObj.format("YYYY년 MM월 DD일")} ${weekDayName}`}
                      </div>
                      <div className="ml-2">
                        <span>{`${displayTime(startAt)}`}</span>
                        <span>{`~ ${displayTime(endAt)}`}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        <div className="flex justify-center my-2">
          <div className="flex pt-3 mb-2 px-4 text-lg border-b-2 border-red-800">
            <span>첫 수업일 : </span>
            <span className="font-bold">{firstDay} </span>
          </div>
        </div>
      </div>
      <div
        className="btn btn-sm btn-accent"
        onClick={() => {
          setSteps(3);
        }}
      >
        다음
      </div>
    </div>
  );
};

const ShowTrainerScheduleCheck = ({
  chosenSchedule,
  trainerId,
  pattern,
  totalCount,
  setSteps,
  setCheckedSchedule,
}: {
  chosenSchedule: DaySchedule;
  trainerId: string;
  pattern: {
    regular: boolean;
    howmany: number;
  };
  totalCount: number;
  setSteps: Dispatch<SetStateAction<number>>;
  setCheckedSchedule: Dispatch<SetStateAction<ISchedule[] | undefined>>;
}) => {
  const [summary, setSummary] = useState<ICheckedSchedule | null>(null);
  const [summaryError, setSummaryError] = useState<boolean>(false);

  const onConfirm = () => {
    if (summary && summary.success.length > 0) {
      setCheckedSchedule(summary.success);
      setSteps(4);
    }
  };

  useEffect(() => {
    const calculate = async () => {
      const result = await trainerScheduleCheck({
        trainerId,
        chosenSchedule,
        pattern,
        totalCount,
      });
      if (result.ok) {
        setSummary(result.data);
      } else {
        setSummaryError(true);
      }
    };
    calculate();
  }, [chosenSchedule, trainerId, pattern, totalCount]);

  if (summaryError) {
    return (
      <div className="w-full flex flex-col">
        <span>스케줄을 확인하는 중 오류가 발생했습니다.</span>
        <span>잠시 후 다시 시도해주세요.</span>
        <div className="btn btn-lg">이전 단계로 돌아가기</div>
      </div>
    );
  } else if (summary === null) {
    return (
      <div className="w-full flex flex-col">
        <span>스케줄을 확인하는 중입니다.</span>
        <span>잠시만 기다려주세요.</span>
      </div>
    );
  } else {
    return (
      <div className="w-full flex flex-col">
        <div className="flex flex-col gap-2">
          <span>
            {summary.fail.length === 0
              ? "선택하신 모든 일정에 대해 수업이 가능합니다."
              : summary.success.length !== 0
              ? "선택하신 일정 중 아래의 날짜에는 수업이 가능합니다."
              : "예약 가능한 스케줄이 없습니다."}
          </span>
          <div className="flex flex-col gap-2">
            {summary.success
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((schedule) => {
                return (
                  <div
                    key={schedule.date.toString()}
                    className="flex items-center rounded-md border p-2 text-sm border-green-600 shadow-md"
                  >
                    <div className="">
                      {`${schedule.date.getFullYear()}년 ${
                        schedule.date.getMonth() + 1
                      }월 ${schedule.date.getDate()}일 ${
                        weekDayNumberStringMap[
                          schedule.date.getDay() as keyof typeof weekDayNumberStringMap
                        ].kor.long
                      }`}
                    </div>

                    <div className="ml-2">
                      <span>{`${displayTime(schedule.startTime)}`}</span>
                      <span>{`~ ${displayTime(schedule.endTime)}`}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        {summary.fail.length > 0 && (
          <div className="flex flex-col mt-3">
            <span>트레이너 사정에 의해 아래 일정엔 수업이 불가능합니다.</span>
            <div className="flex flex-col">
              {summary.fail
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((schedule) => {
                  return (
                    <div
                      key={schedule.date.toString()}
                      className="flex items-center rounded-md border border-red-500 p-2 text-sm  shadow-md"
                    >
                      <div className="">
                        {`${schedule.date.getFullYear()}년 ${
                          schedule.date.getMonth() + 1
                        }월 ${schedule.date.getDate()}일 ${
                          weekDayNumberStringMap[
                            schedule.date.getDay() as keyof typeof weekDayNumberStringMap
                          ].kor.long
                        }`}
                      </div>

                      <div className="ml-2">
                        <span>{`${displayTime(schedule.startTime)}`}</span>
                        <span>{`~ ${displayTime(schedule.endTime)}`}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        <div className="w-full p-2 border shadow-lg mt-3 rounded-lg flex flex-col">
          <span className="text-center">안내</span>
          <p className="whitespace-pre-line px-10">
            여기서 생성한 스케줄은 수업 1일전까지는 언제든 변경이 가능합니다.
            트레이너 일정으로 인해 스케줄을 생성하지 못한 경우는 추후
            마이페이지에서 개별로 등록이 가능합니다.
          </p>
        </div>
        {summary.success.length > 0 && (
          <div className="w-full flex flex-col justify-center items-center mt-3">
            <div className={`btn btn-lg btn-secondary`} onClick={onConfirm}>
              이 일정으로 수업 등록하기
            </div>
          </div>
        )}
      </div>
    );
  }
};

const ShowSummary = ({
  chosenCenter,
  chosenSchedule,
  checkedSchedule,
  chosenTrainerAndPt,
  pattern,
  isPending,
  onSubmit,
}: {
  chosenCenter: ICentersForMember[number];
  chosenSchedule: DaySchedule;
  checkedSchedule: ISchedule[];
  chosenTrainerAndPt: IChosenTrainerAndPt;
  pattern: {
    regular: boolean;
    howmany: number;
  };
  isPending: boolean;
  onSubmit: () => void;
}) => {
  const [isPop, setIsPop] = useState(false);
  const weekSchedule = createWeekScheduleFromChosenSchedule({
    chosenSchedule: chosenSchedule,
  });
  console.log(isPop);
  return (
    <div className="w-full flex flex-col">
      {isPop && (
        <div className="fixed z-10  top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-5 flex flex-col rounded-md shadow-md w-2/3 mx-auto top-1/4 h-1/2">
            <div className="flex flex-col">
              <span>서버에 수업을 등록중입니다.</span>
              <span className="mt-2">신청하신 PT는 마이페이지에서 </span>
              <span>확인하실 수 있습니다.</span>
              <span className="mt-2">담당 트레이너가 확인 후 </span>
              <span>승인하면 수업이 확정됩니다.</span>
              <span className="mt-2">수업이 확정되면 </span>
              <span>알림을 통해 알려드립니다.</span>
              <span className="mt-2">수업료는 첫 수업일에 </span>
              <span>현장에서 결제하시면 됩니다.</span>
            </div>
            <div></div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span>감사합니다.</span>
        <span>신청하신 PT는 아래와 같습니다.</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="CTPCard p-5 pt-1 border rounded-md shadow-lg">
          <div className="flex ">
            <div className="w-1/3 font-bold border-b-4 border-slate-700 py-2 text-center">
              <span>센터</span>
            </div>
            <div className="w-2/3 ml-4 border-b-4 pl-2 border-gray-400 py-2 ">
              <span>{chosenCenter.title}</span>
            </div>
          </div>
          <div className="flex ">
            <div className="w-1/3 font-bold border-b-4 border-slate-700 py-2 text-center">
              <span>PT 프로그램</span>
            </div>
            <div className="w-2/3 ml-4 border-b-4 pl-2 border-gray-400 py-2">
              <span>{chosenTrainerAndPt?.title}</span>
              <span className="text-sm ml-4">
                (총 {chosenTrainerAndPt?.totalCount}회)
              </span>
            </div>
          </div>
          <div className="flex ">
            <div className="w-1/3 font-bold border-b-4 border-slate-700 py-2 text-center">
              <span>트레이너</span>
            </div>
            <div className="w-2/3 ml-4 border-b-4 pl-2 border-gray-400 py-2 ">
              <span>{chosenTrainerAndPt?.trainer.user.username}</span>
            </div>
          </div>
        </div>
        {pattern.regular && (
          <div className="flex flex-col gap-2 mt-5">
            <div>
              <span>정규 스케줄</span>
              <span className="font-bold rounded-md  py-1 px-3 text-gray-700">{`주 ${pattern.howmany}회`}</span>
            </div>
            <div className="WEEKSCHEDULE flex flex-wrap items-center gap-2">
              {weekSchedule.map((daySchedule) => {
                const { endTime, startTime } = daySchedule;
                const weekDayName =
                  weekDayNumberStringMap[daySchedule.day].kor.long;
                return (
                  <div
                    key={daySchedule.day}
                    className="flex items-center rounded-md border p-2 text-sm border-gray-100 shadow-md"
                  >
                    <span className="  font-semibold">{weekDayName} :</span>
                    <span>{`${displayTime(startTime)}`}</span>
                    <span>{`~ ${displayTime(endTime)}`}</span>
                  </div>
                );
              })}
            </div>
            <div className="CHECKEDSCHEDULE flex flex-col">
              {checkedSchedule.map((schedule) => {
                return (
                  <div key={schedule.date.toString()}>
                    <div className="flex max-w-fit  items-center  border-b-2 p-2 px-4 text-sm border-gray-100">
                      <div className="">
                        {`${schedule.date.getFullYear()}년 ${
                          schedule.date.getMonth() + 1
                        }월 ${schedule.date.getDate()}일 ${
                          weekDayNumberStringMap[
                            schedule.date.getDay() as keyof typeof weekDayNumberStringMap
                          ].kor.long
                        }`}
                      </div>

                      <div className="ml-2">
                        <span>{`${displayTime(schedule.startTime)}`}</span>
                        <span>{`~ ${displayTime(schedule.endTime)}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!pattern.regular && (
          <div className="flex flex-col">
            <div className="flex flex-col gap-2">
              <span className="">수시 스케줄</span>
              <span className="text-sm">2개의 일정이 예약되었습니다.</span>
              <span className="text-sm">
                남은 일정은 PT기간 내에 스케줄을 등록해주세요
              </span>
            </div>
            <div>
              {checkedSchedule.map((schedule) => {
                return (
                  <div key={schedule.date.toString()}>
                    <div className="flex max-w-fit  items-center  border-b-2 p-2 px-4 text-sm border-gray-100">
                      <div className="">
                        {`${schedule.date.getFullYear()}년 ${
                          schedule.date.getMonth() + 1
                        }월 ${schedule.date.getDate()}일 ${
                          weekDayNumberStringMap[
                            schedule.date.getDay() as keyof typeof weekDayNumberStringMap
                          ].kor.long
                        }`}
                      </div>

                      <div className="ml-2">
                        <span>{`${displayTime(schedule.startTime)}`}</span>
                        <span>{`~ ${displayTime(schedule.endTime)}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-center items-center">
        <button
          className="btn btn-lg btn-primary mt-4"
          type="submit"
          disabled={isPending}
          onClick={() => {
            setIsPop(true);
            onSubmit();
          }}
        >
          {isPending ? "잠시만 기다려주세요" : "PT 신청하기"}
        </button>
      </div>
    </div>
  );
};

export default SubscribePt;
