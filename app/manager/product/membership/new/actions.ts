'use server'

import prisma from '@/app/lib/prisma'
import { Prisma } from '@prisma/client'
import type { DateRange } from 'react-day-picker'

export interface INewMembershipData {
  title: string
  price: number
  totalCount: number
  description: string
  onSale: string
  isLimitedTime: string
  dateRange: DateRange | undefined
}

export interface INewMembershipProductSubmitData
  extends Omit<INewMembershipData, 'isLimitedTime' | 'dateRange'> {
  openedAt: Date
  closedAt: Date
}

interface INewMembershipSubmitSuccess {
  ok: true
  data: {
    id: string
  }
}
interface INewMembershipSubmitError {
  ok: false
  error: string
}

export type INewMembershipSubmitResult =
  | INewMembershipSubmitSuccess
  | INewMembershipSubmitError

export const membershipSubmit = async (
  submitData: INewMembershipProductSubmitData
): Promise<INewMembershipSubmitResult> => {
  try {
    const newMembershipProduct = await prisma.membershipProduct.create({
      data: {
        title: submitData.title,
        price: Number(submitData.price),
        description: submitData.description,
        totalCount: Number(submitData.totalCount),
        openedAt: submitData.openedAt,
        closedAt: submitData.closedAt,
        onSale: Boolean(submitData.onSale === 'true')
      },
      select: {
        id: true
      }
    })

    return {
      ok: true,
      data: {
        id: newMembershipProduct.id
      }
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // 유니크 제약 조건 위반 에러 (P2002)
      if (error.code === 'P2002') {
        return {
          ok: false,
          error: '중복된 이름이 있습니다. 다른 이름을 사용해 주세요.'
        }
      }
    }

    // 그 외의 모든 에러

    return {
      ok: false,
      error: '데이터베이스 에러가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
  }
}
