import dayjs from 'dayjs'
import { addThirtyMinutes, convertKSTtoUTC } from './utils'
import prisma from './prisma'
import { serverError } from './constants'

export interface Schedule {
  date: Date
  startTime: number
  endTime: number
}

export interface DaySchedule {
  [date: string]: number[]
}

export interface WeekSchedule {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  startTime: number
  endTime: number
}

export const createWeekScheduleFromChosenSchedule = ({
  chosenSchedule
}: {
  chosenSchedule: DaySchedule
}): WeekSchedule[] => {
  // chosenSchedule: { "YYYY-MM-DD": [startTime, startTime, ...], ... }
  const weekSchedule: WeekSchedule[] = Object.keys(chosenSchedule)
    .map(date => {
      const day = dayjs(date).day()
      const startTime = chosenSchedule[date].sort()[0]
      const endTime = addThirtyMinutes(chosenSchedule[date].sort().reverse()[0])
      return { day, startTime, endTime }
    })
    .sort((a, b) => {
      return a.day - b.day
    })
  return weekSchedule
}

export const generateRegularSchedules = (
  weekSchedule: { day: number; startTime: number; endTime: number }[],
  totalCount: number,
  firstDay: dayjs.Dayjs
): Schedule[] => {
  const weekOrder = weekSchedule.map(item => item.day)
  const schedules: Schedule[] = []
  let currentDay = firstDay

  while (schedules.length < totalCount) {
    const date = currentDay.toDate()
    const day = currentDay.day()
    const currentDayIndex = weekOrder.indexOf(day)
    const scheduleForDay = weekSchedule.find(item => item.day === day)
    if (!scheduleForDay) {
      break
    }
    const { startTime, endTime } = scheduleForDay
    schedules.push({ date, startTime, endTime })

    if (currentDayIndex === weekOrder.length - 1) {
      // 다음주로 넘어감 (weekOrder[0]이 다음주 첫째 요일)
      currentDay = currentDay.add(1, 'week').day(weekOrder[0])
    } else {
      // 다음 요일로 넘어감 (weekOrder에서 day의 다음 요일)
      currentDay = currentDay.day(weekOrder[currentDayIndex + 1])
    }
  }

  return schedules
}

export const convertRegularChosenScheduleToDate = ({
  chosenSchedule,
  totalCount
}: {
  chosenSchedule: DaySchedule
  totalCount: number
}): Schedule[] | undefined => {
  // chosenSchedule: { "YYYY-MM-DD": [startTime, startTime, ...], ... }
  // totalCount: 총 세션 수

  if (Object.keys(chosenSchedule).length === 0) return // 날짜가 선택되지 않았을 경우
  if (
    Object.keys(chosenSchedule).some(date => chosenSchedule[date].length === 0)
  )
    return // 시간이 선택되지 않은 날짜가 있을 경우

  const firstDay = dayjs(
    Object.keys(chosenSchedule).sort((a, b) => {
      return a.localeCompare(b)
    })[0]
  )

  const weekSchedule = createWeekScheduleFromChosenSchedule({ chosenSchedule })

  return generateRegularSchedules(weekSchedule, totalCount, firstDay)
}
export const isExistSchedule = async ({
  trainerId,
  date,
  startTime,
  endTime
}: {
  trainerId: string
  date: Date
  startTime: number
  endTime: number
}) => {
  // KST => UTC
  const utcDate = convertKSTtoUTC(date)
  const trainerSchedule = await prisma.ptSchedule.findFirst({
    where: {
      date: utcDate,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ptRecord: {
        some: {
          pt: {
            trainerId: trainerId
          }
        }
      }
    },
    select: {
      id: true
    }
  })

  return Boolean(trainerSchedule) // 이미 예약된 스케줄이 있으면 true, 없으면 false
}

export const createTrainerPossibleRegularSchedules = async ({
  trainerId,
  chosenSchedule,
  totalCount
}: {
  trainerId: string
  chosenSchedule: DaySchedule
  totalCount: number
}) => {
  // 트레이너의 스케줄을 확인하고, 이미 예약되었을 경우 예약이 불가능한 스케줄을 반환
  const result = {
    success: [] as Schedule[],
    fail: [] as Schedule[],
    old: [] as Schedule[]
  }

  // weekSchedule: [{ day: 0~6, startTime: number, endTime: number }, ...]
  // 어떤 요일 몇시에 하는지 정해진 정규 스케줄
  const weekSchedule = createWeekScheduleFromChosenSchedule({ chosenSchedule })

  // schedules: weekSchedule을 기반으로 totalCount만큼의 스케줄을 생성
  const schedules = convertRegularChosenScheduleToDate({
    chosenSchedule,
    totalCount
  })
  if (!schedules) return false

  await Promise.all(
    schedules.map(async schedule => {
      const isExist = await isExistSchedule({ trainerId, ...schedule })
      if (isExist) {
        result.fail.push(schedule)
      } else {
        result.success.push(schedule)
      }
    })
  )

  return result
}

type CreatePendingScheduleSuccess = {
  ok: true
  data: {
    scheduleCount: number
    ptScheduleCount: number
    ptRecordCount: number
  }
}

type CreatePendingScheduleFail = {
  ok: false
  code: string
}

type CreatePendingScheduleResult =
  | CreatePendingScheduleSuccess
  | CreatePendingScheduleFail

export const createPendingSchedule = async ({
  schedules,
  ptId
}: {
  schedules: Schedule[]
  trainerId: string
  ptId: string
}): Promise<CreatePendingScheduleResult> => {
  // create PtRecord and PtSchedule
  try {
    // step 1 - create or find PtSchedule
    const ptSchedules = await Promise.all(
      schedules.map(async schedule => {
        return prisma.ptSchedule.upsert({
          where: {
            date_startTime_endTime: {
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          },
          update: {},
          create: {
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          },
          select: { id: true }
        })
      })
    )

    const ptRecordCreationResult = await prisma.ptRecord.createMany({
      data: ptSchedules.map(({ id }) => {
        return {
          ptId,
          ptScheduleId: id
        }
      })
    })

    return {
      ok: true,
      data: {
        scheduleCount: schedules.length,
        ptScheduleCount: ptSchedules.length,
        ptRecordCount: ptRecordCreationResult.count
      }
    }
  } catch (error) {
    console.log('error', error)
    return { ok: false, code: `${serverError.prisma}` }
  }
}
