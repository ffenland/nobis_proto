'use server'

import {
  responseError,
  scheduleError,
  serverError,
  ptError,
  weekDayNumberStringMap
} from '@/app/lib/constants'
import prisma from '@/app/lib/prisma'
import {
  createPendingSchedule,
  createTrainerPossibleRegularSchedules,
  DaySchedule,
  isExistSchedule,
  Schedule,
  WeekSchedule
} from '@/app/lib/schedule'
import { getSession } from '@/app/lib/session'
import { addThirtyMinutes } from '@/app/lib/utils'
import { Prisma, WeekDay } from '@prisma/client'
import dayjs from 'dayjs'

export type IPtProduct = Prisma.PromiseReturnType<typeof getPtProducts>[number]
export type ITrainer = Prisma.PromiseReturnType<typeof getTrainers>[number]
export type ITrainer3MSchedule = Prisma.PromiseReturnType<
  typeof get3MonthTrainerSchedule
>

export const getPtProducts = async () => {
  const ptProducts = await prisma.ptProduct.findMany({
    where: {
      onSale: true
    },
    select: {
      id: true,
      title: true,
      description: true,
      totalCount: true,
      time: true,
      price: true,
      trainer: {
        select: {
          id: true
        }
      }
    }
  })
  return ptProducts
}

export const getTrainers = async () => {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: { select: { username: true } },
      avatar: true,
      introduce: true
    }
  })

  return trainers
}

const getStartTimePoints = (startTime: number, endTime: number): number[] => {
  const timeSlots: number[] = []
  let currentHour = Math.floor(startTime / 100)
  let currentMinute = startTime % 100

  while (currentHour * 100 + currentMinute < endTime) {
    timeSlots.push(currentHour * 100 + currentMinute)
    currentMinute += 30
    if (currentMinute >= 60) {
      currentMinute = 0
      currentHour++
    }
  }
  return timeSlots
}

export const get3MonthTrainerSchedule = async ({
  trainerId,
  targetDate
}: {
  trainerId: string
  targetDate: Date
}) => {
  // targetDate를 해당 월의 첫째 날로 설정
  const firstDateOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  )
  firstDateOfMonth.setHours(firstDateOfMonth.getHours() - 9) // UTC로 설정

  // 3개월 후의 첫째 날 계산
  const threeMonthsLater = new Date(firstDateOfMonth)
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

  const threeMonthTrainerSchedule = await prisma.ptSchedule.findMany({
    where: {
      ptRecord: {
        some: {
          pt: {
            trainerId
          },
          ptSchedule: {
            date: { gte: firstDateOfMonth, lt: threeMonthsLater }
          }
        }
      }
    },
    select: {
      date: true,
      startTime: true,
      endTime: true
    }
  })

  // const trainerSchedule = await prisma.trainer.findFirst({
  //   where: {
  //     id: trainerId,
  //     pt: {
  //       some: {
  //         ptRecord: {
  //           some: {
  //             ptSchedule: {
  //               date: { gte: firstDateOfMonth, lt: threeMonthsLater }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   },
  //   select: {
  //     pt: {
  //       select: {
  //         ptRecord: {
  //           select: {
  //             ptSchedule: {
  //               select: { date: true, startTime: true, endTime: true }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // })

  // 가공
  const schedule: DaySchedule = {}

  threeMonthTrainerSchedule.forEach(item => {
    const dateKey = item.date.toISOString().split('T')[0] // "YYYY-MM-DD"
    if (!schedule[dateKey]) {
      schedule[dateKey] = []
    }
    const startTimes = getStartTimePoints(item.startTime, item.endTime)

    schedule[dateKey] = [...schedule[dateKey], ...startTimes]
  })

  return schedule
}

export interface CheckedSchedule {
  success: Schedule[]
  fail: Schedule[]
}
export type TrainerScheduleCheckResult =
  | {
      ok: true
      data: CheckedSchedule
    }
  | { ok: false; code: string }

export const trainerScheduleCheck = async ({
  isRegular,
  totalCount,
  trainerId,
  chosenSchedule
}: {
  isRegular: boolean
  totalCount: number
  trainerId: string
  chosenSchedule: DaySchedule
}): Promise<TrainerScheduleCheckResult> => {
  const session = await getSession()
  if (!session)
    return { ok: false, code: responseError.sesseion.noSession.code }
  if (session.role !== 'MEMBER')
    return { ok: false, code: responseError.sesseion.roleMismatch.code }

  try {
    if (isRegular) {
      const checkedSchedules = await createTrainerPossibleRegularSchedules({
        trainerId,
        chosenSchedule,
        totalCount
      })
      if (!checkedSchedules) {
        return { ok: false, code: scheduleError.chosenSchedule.notChosen.code }
      } else {
        return { ok: true, data: { ...checkedSchedules } }
      }
    } else {
      const checkedSchedules: {
        success: Schedule[]
        fail: Schedule[]
      } = { success: [], fail: [] }
      const irregularSchedule: Schedule[] = Object.keys(chosenSchedule)
        .map(chosenDay => {
          const date = dayjs(chosenDay).toDate()
          const startTime = chosenSchedule[chosenDay].sort()[0]
          const endTime = addThirtyMinutes(
            chosenSchedule[chosenDay].sort().reverse()[0]
          )
          return { date, startTime, endTime }
        })
        .sort((a, b) => {
          return a.date.getTime() - b.date.getTime()
        })
      await Promise.all(
        irregularSchedule.map(async schedule => {
          const isExist = await isExistSchedule({ trainerId, ...schedule })
          if (isExist) {
            checkedSchedules.fail.push(schedule)
          } else {
            checkedSchedules.success.push(schedule)
          }
        })
      )
      return { ok: true, data: { ...checkedSchedules } }
    }
  } catch (error) {
    console.log('error', error)
    return { ok: false, code: `${serverError.unknown.code} - ${error}` }
  }
}

type IgoToCheckoutResult = IgoToCheckoutSuccess | IgoToCheckoutFail

interface IgoToCheckoutSuccess {
  ok: true
  data: {
    ptId: string
    message: string
  }
}
interface IgoToCheckoutFail {
  ok: false
  code: string
}

export const goToCheckout = async ({
  schedules,
  weekSchedules,
  trainerId,
  ptProductId,
  isRegular
}: {
  schedules: Schedule[]
  weekSchedules: WeekSchedule[]
  trainerId: string
  ptProductId: string
  isRegular: boolean
}): Promise<IgoToCheckoutResult> => {
  const session = await getSession()
  if (!session)
    return { ok: false, code: responseError.sesseion.noSession.code }
  if (session.role !== 'MEMBER')
    return { ok: false, code: responseError.sesseion.roleMismatch.code }

  const firstDate = schedules.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )[0].date
  // create schedules and Pt model
  try {
    // pt를 먼저 생성한다.
    const newPt = await prisma.pt.create({
      data: {
        startDate: firstDate,
        memberId: session.roleId,
        trainerId,
        ptProductId,
        isRegular,
        weekTimes: {
          connectOrCreate: weekSchedules.map(schedule => ({
            where: {
              weekDay_startTime_endTime: {
                weekDay:
                  WeekDay[
                    weekDayNumberStringMap[schedule.day].eng
                      .short as keyof typeof WeekDay
                  ],
                startTime: schedule.startTime,
                endTime: schedule.endTime
              }
            },
            create: {
              weekDay:
                WeekDay[
                  weekDayNumberStringMap[schedule.day].eng
                    .short as keyof typeof WeekDay
                ],
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          }))
        }
      },
      select: {
        id: true
      }
    })

    const creationResult = await createPendingSchedule({
      ptId: newPt.id,
      schedules,
      trainerId
    })
    if (creationResult.ok) {
      // 뭐라도 스케줄을 만든경우
      const message =
        creationResult.data.scheduleCount === creationResult.data.scheduleCount
          ? '예약이 완료되었습니다.'
          : '예약이 완료되었습니다. 일부 스케줄은 예약이 불가능합니다.'
      return { ok: true, data: { ptId: newPt.id, message } }
    } else {
      // 스케줄을 만들지 못한 경우
      return { ok: false, code: ptError.schedule.failCreation.code }
    }
  } catch (error) {
    console.log('error', error)
    return { ok: false, code: `${serverError.unknown.code} - ${error}` }
  }
}
