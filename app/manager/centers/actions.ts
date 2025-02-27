'use server'

import prisma from '@/app/lib/prisma'
import { Prisma } from '@prisma/client'

export type ICenterSummary = Prisma.PromiseReturnType<
  typeof getCenterSummaries
>[number]
export const getCenterSummaries = async () => {
  'use server'
  const now = new Date() // 현재 시간 GMT+9
  const koreaTimezoneOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로 변환
  const serverNow = new Date(now.getTime() - koreaTimezoneOffset)
  // const threeMonthsLater = new Date(
  //   serverNow.getFullYear(),
  //   serverNow.getMonth() + 3,
  //   serverNow.getDate()
  // )

  return await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      _count: { select: { trainers: true } },
      offDays: {
        where: {
          date: serverNow
        }
      }
    }
  })
}
