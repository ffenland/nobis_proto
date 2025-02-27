'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  CheckedSchedule,
  get3MonthTrainerSchedule,
  getPtProducts,
  getTrainers,
  goToCheckout,
  IPtProduct,
  ITrainer,
  trainerScheduleCheck
} from './actions'

import { useRouter } from 'next/navigation'
import {
  PtChosenSummary,
  PtConfirmModal,
  PtScheduleChooseDayTime,
  PtSelector,
  TrainerCard
} from '@/app/components/pt/submitPtComponents'
import { displayTime, getStartEndTime } from '@/app/lib/utils'
import dayjs from 'dayjs'
import { responseError, weekDayNumberStringMap } from '@/app/lib/constants'
import {
  createWeekScheduleFromChosenSchedule,
  DaySchedule
} from '@/app/lib/schedule'

const NewPT = () => {
  const router = useRouter()

  const [ptProducts, setPtProducts] = useState<IPtProduct[]>()
  const [trainers, setTrainers] = useState<ITrainer[]>()
  const [chosenPtProduct, setChosenPtProduct] = useState<IPtProduct>()
  const [chosenTrainer, setChosenTrainer] = useState<ITrainer>()
  const [isRegular, setIsRegular] = useState<boolean>()
  const [regularTime, setRegularTime] = useState(0)
  const [chosenSchedule, setChosenSchedule] = useState<DaySchedule>({})
  const [trainerSchedule, setTrainerSchedule] = useState<DaySchedule>()
  const [checkedSchedule, setCheckedSchedule] = useState<CheckedSchedule>()
  const [toast, setToast] = useState<string>()
  const [errorToast, setErrorToast] = useState<string>()
  const [isPending, startTransition] = useTransition()

  const onPtClick = (id: string) => {
    if (!ptProducts) return
    const chosenPt = ptProducts.find(pt => pt.id === id)
    if (chosenPt) {
      if (chosenPtProduct && chosenPtProduct.id === chosenPt.id) {
        setChosenPtProduct(undefined)
      } else {
        setChosenPtProduct(chosenPt)
      }
      setChosenTrainer(undefined)
    }
  }

  const onTrainerClick = (trainerId: string) => {
    if (!trainers) return
    const trainer = trainers.find(tr => tr.id === trainerId)

    if (trainer) {
      setIsRegular(undefined)
      if (chosenTrainer && chosenTrainer.id === trainer.id) {
        setChosenTrainer(undefined)
      } else {
        setChosenTrainer(trainer)
      }
    }
  }

  const onConfirm = async () => {
    if (isPending) return // 이미 요청중이면 무시
    if (!chosenPtProduct || !chosenTrainer || isRegular === undefined) {
      // 필수 정보가 없을때
      return
    }
    if (
      (isRegular && regularTime !== Object.keys(chosenSchedule).length) ||
      (!isRegular && Object.keys(chosenSchedule).length !== 2)
    ) {
      // 정규일정이 아닐때는 2개의 일정을 선택해야함
      return
    }

    startTransition(async () => {
      try {
        const result = await trainerScheduleCheck({
          totalCount: chosenPtProduct.totalCount,
          trainerId: chosenTrainer.id,
          isRegular,
          chosenSchedule
        })
        if (
          result.ok === false &&
          result.code === responseError.sesseion.noSession.code
        )
          router.push('/login') // 세션이 없으면 로그인 페이지로 이동

        if (
          result.ok === false &&
          result.code === responseError.sesseion.roleMismatch.code
        )
          router.push('/') // 세션의 역할이 맞지 않으면 홈으로 이동  (미들웨어에서 사전처리되서 이럴 경우는 없다.)
        if (result && result.ok) {
          if (result.data) {
            setCheckedSchedule({
              success: result.data.success,
              fail: result.data.fail
            })
          }
        }
      } catch (error) {
        console.error('Error checking trainer schedule:', error)
        // 에러 처리 로직 추가
      }
    })
  }

  const onFinalConfirm = async () => {
    if (isPending) return // 이미 요청중이면 무시
    if (!chosenPtProduct || !chosenTrainer || isRegular === undefined) {
      // 필수 정보가 없을때
      return
    }
    if (
      (isRegular && regularTime !== Object.keys(chosenSchedule).length) ||
      (!isRegular && Object.keys(chosenSchedule).length !== 2)
    ) {
      // 정규일정이 아닐때는 2개의 일정을 선택해야함
      return
    }
    if (!checkedSchedule) {
      // 일정이 체크되지 않았을때
      return
    }
    const weekSchedules = isRegular
      ? createWeekScheduleFromChosenSchedule({
          chosenSchedule
        })
      : []
    const result = await goToCheckout({
      schedules: checkedSchedule.success,
      weekSchedules,
      trainerId: chosenTrainer.id,
      ptProductId: chosenPtProduct.id,
      isRegular
    })
    if (result && result.ok) {
      setToast(result.data.message + '\n' + 'PT 페이지로 이동합니다.')
      setTimeout(() => {
        router.push(`/member/pt/detail?id=${result.data.ptId}`)
      }, 3000)
    } else {
      setErrorToast(
        '스케줄 생성에 실패했습니다. 5초 후 페이지가 다시 열립니다.'
      )
      setTimeout(() => {
        router.refresh()
      }, 3000)
    }
  }

  const onReset = () => {
    setChosenPtProduct(undefined)
    setChosenTrainer(undefined)
    setIsRegular(undefined)
    setRegularTime(0)
    setChosenSchedule({})
    setCheckedSchedule(undefined)
  }

  useEffect(() => {
    const initialize = async () => {
      const dbPtProducts = await getPtProducts()
      const dbTrainers = await getTrainers()
      setPtProducts(dbPtProducts)
      setTrainers(dbTrainers)
    }
    initialize()
  }, [])

  useEffect(() => {
    const getTrainerSchedule = async (trainerId: string, date?: Date) => {
      const targetDate = date || new Date()
      const dbTrainerSchedule = await get3MonthTrainerSchedule({
        trainerId,
        targetDate
      })

      setTrainerSchedule(dbTrainerSchedule)
    }
    if (chosenTrainer && isRegular !== undefined) {
      // get trainer schedule
      const getCurrentDate = () => new Date()
      getTrainerSchedule(chosenTrainer.id, getCurrentDate())
    }
  }, [chosenTrainer, isRegular])

  useEffect(() => {
    // chosenSchedule이 꽉 찼을때
    //
    if (isRegular) {
    } else {
    }
  }, [isRegular, chosenSchedule])

  return (
    <div className="flex w-full flex-col">
      <div className="CHOSEN mb-2 flex flex-col items-center rounded-md border">
        <div className="PT flex gap-3 text-lg">
          {chosenPtProduct ? (
            <span className="font-bold">{chosenPtProduct.title}</span>
          ) : null}
          {chosenTrainer ? (
            <div>
              <span>트레이너 : </span>
              <span className="font-bold">
                {chosenTrainer.user.username}
              </span>{' '}
            </div>
          ) : null}
        </div>
        <div className="w-full p-2">
          {chosenSchedule && Object.keys(chosenSchedule).length > 0 ? (
            <div className="CHOSEN flex w-full flex-col items-center overflow-x-hidden">
              <div className="text-sm">
                <span>수업 시작일 : </span>
                <span className="font-bold">
                  {Object.keys(chosenSchedule).sort()[0].split('-')[0]}년
                  {' ' + Object.keys(chosenSchedule).sort()[0].split('-')[1]}월
                  {' ' + Object.keys(chosenSchedule).sort()[0].split('-')[2]}일
                </span>
              </div>
              <div
                className={`CHOSENDAYS flex w-full text-sm ${
                  isRegular ? 'justify-center gap-5' : 'gap-1 overflow-x-auto'
                }`}>
                {Object.keys(chosenSchedule)
                  .sort()
                  .map(day => {
                    const { startAt, endAt } = getStartEndTime(
                      chosenSchedule[day]
                    )

                    const dayObj = dayjs(day)
                    const weekDayName =
                      weekDayNumberStringMap[dayObj.day()].kor.long

                    if (isRegular) {
                      return (
                        <div
                          key={day}
                          className="flex flex-col items-center rounded-md border p-1 text-sm">
                          <span className="mb-1 font-semibold">
                            {weekDayName}
                          </span>
                          <span>{`${displayTime(startAt)}`}</span>
                          <span>{`~ ${displayTime(endAt)}`}</span>
                        </div>
                      )
                    } else {
                      return (
                        <div
                          key={day}
                          className="flex min-w-32 flex-col items-center rounded-md border p-1 text-sm">
                          <div className="font-semibold">
                            {dayObj.format('YYYY년MM월DD일')}
                          </div>

                          <div>{`${startAt} ~ ${endAt}`}</div>
                        </div>
                      )
                    }
                  })}
              </div>
            </div>
          ) : chosenPtProduct && chosenTrainer && regularTime > 0 ? (
            <div className="INFO rounded-md border px-3 shadow-md">
              <p>
                첫 수업을 시작할 날과 이후 수업을 받으실 요일과 시간을
                선택해주세요.
              </p>
              <p>이미 선택한 시간을 다시 선택하시면 취소됩니다.</p>
              <p></p>
            </div>
          ) : null}
        </div>
      </div>
      {!chosenPtProduct ? (
        // 1단계 ptProduct 선택하기, 선택한 PtProduct가 있으면 그거 보여주기
        ptProducts && ptProducts.length > 1 ? (
          <PtSelector
            ptProducts={ptProducts}
            onPtProdcutClick={onPtClick}
          />
        ) : (
          <div>PT프로그램을 찾고 있습니다.</div>
        )
      ) : (
        <>
          {!chosenTrainer ? (
            // 2단계 트레이너 선택
            <div>
              <span>프로그램을 함께할 트레이너를 선택해주세요.</span>
              <div className="TRAINERS flex flex-col gap-2 p-2">
                {chosenPtProduct.trainer.map(tr => {
                  const trainer = trainers?.find(item => item.id === tr.id)
                  return trainer ? (
                    <TrainerCard
                      key={trainer.id}
                      trainer={trainer}
                      onTrainerClick={onTrainerClick}
                    />
                  ) : null
                })}
              </div>
            </div>
          ) : (
            <>
              {isRegular === undefined ? (
                <div className="CHOOSEREGULAR mt-2 flex flex-col items-center justify-stretch gap-5">
                  <span className="text-lg">일정유형을 선택해주세요.</span>
                  <div className="flex w-full gap-4 px-2">
                    <div
                      onClick={() => {
                        setIsRegular(true)
                      }}
                      className="flex flex-1 flex-col rounded-md bg-red-50 p-3 shadow-md">
                      <span className="mb-2 text-center text-lg font-bold">
                        정규
                      </span>
                      <span>요일과 시간을 정하고</span>
                      <span>매주 반복된 일정으로</span>
                      <span>운동을 진행</span>
                    </div>
                    <div
                      onClick={() => {
                        setIsRegular(false)
                      }}
                      className="flex flex-1 flex-col rounded-md bg-blue-50 p-3 shadow-md">
                      <span className="mb-2 text-center text-lg font-bold">
                        비정규
                      </span>
                      <span>원하는 날짜와 시간을</span>
                      <span>매번 임의로 선택하여</span>
                      <span>운동을 진행</span>
                    </div>
                  </div>
                </div>
              ) : !checkedSchedule ? ( // 일정을 아직 확정하지 않은 경우
                isRegular === true ? (
                  regularTime === 0 ? (
                    <div className="HOWMANYAWEEK">
                      <div className="flex items-center justify-center">
                        <span>일주일에 몇번 PT 수업을 받으실건가요?</span>
                      </div>
                      <div className="flex items-center justify-around">
                        {[1, 2, 3, 4].map(count => {
                          return (
                            <div
                              key={count}
                              className={`rounded-md border p-3 shadow-md`}
                              onClick={() => {
                                setRegularTime(count)
                              }}>
                              주 {count}회
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div>
                        {trainerSchedule ? (
                          <PtScheduleChooseDayTime
                            trainerSchedule={trainerSchedule}
                            howmany={regularTime}
                            chosenSchedule={chosenSchedule}
                            setChosenSchedule={setChosenSchedule}
                            isRegular={true}
                            duration={chosenPtProduct.time}
                          />
                        ) : (
                          <div>
                            서버에서 트레이너 스케줄을 받아오지 못했습니다. 다시
                            시도하시고 계속 이 에러가 표시된다면 관리자에게
                            문의해주세요.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    {trainerSchedule ? (
                      <PtScheduleChooseDayTime
                        trainerSchedule={trainerSchedule}
                        howmany={2}
                        chosenSchedule={chosenSchedule}
                        setChosenSchedule={setChosenSchedule}
                        isRegular={false}
                        duration={chosenPtProduct.time}
                      />
                    ) : (
                      <div>
                        서버에서 트레이너 스케줄을 받아오지 못했습니다. 다시
                        시도하시고 계속 이 에러가 표시된다면 관리자에게
                        문의해주세요.
                      </div>
                    )}
                  </div>
                ) // 일정을 확정한 경우
              ) : (
                <PtChosenSummary
                  checkedSchedule={checkedSchedule}
                  onReset={onReset}
                  onConfirm={onFinalConfirm}
                />
              )}
            </>
          )}
        </>
      )}
      {Object.keys(chosenSchedule).length > 0 &&
      checkedSchedule === undefined &&
      ((isRegular === true &&
        Object.keys(chosenSchedule).length === regularTime) ||
        (isRegular === false && Object.keys(chosenSchedule).length === 2)) ? (
        <PtConfirmModal
          chosenSchedule={chosenSchedule}
          ptName={chosenPtProduct?.title}
          trainerName={chosenTrainer?.user.username}
          isRegular={isRegular}
          howmany={regularTime}
          onReset={onReset}
          onConfirm={onConfirm}
          isPending={isPending}
        />
      ) : null}
    </div>
  )
}

export default NewPT
