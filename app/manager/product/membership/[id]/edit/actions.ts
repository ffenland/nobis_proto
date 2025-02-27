'use server'

import prisma from '@/app/lib/prisma'
import {
  INewMembershipProductSubmitData,
  INewMembershipSubmitResult
} from '@/app/manager/product/membership/new/actions'
import { Prisma } from '@prisma/client'

export type IMembershipProductForEdit = Omit<
  INewMembershipProductSubmitData,
  'onSale'
> & {
  onSale: boolean
}

export type IMembershipProductSubmitDataOptional =
  Partial<IMembershipProductForEdit>
export const getMembershipProduct = async (
  id: string
): Promise<IMembershipProductForEdit | null> => {
  return await prisma.membershipProduct.findUnique({
    where: {
      id: id
    },
    select: {
      id: true,
      title: true,
      price: true,
      totalCount: true,
      description: true,
      onSale: true,
      openedAt: true,
      closedAt: true
    }
  })
}

export const updateMembershipProduct = async ({
  submitData,
  prevMembershipProductId
}: {
  submitData: IMembershipProductSubmitDataOptional
  prevMembershipProductId: string
}): Promise<INewMembershipSubmitResult> => {
  try {
    const updatedMembershipProduct = await prisma.membershipProduct.update({
      where: {
        id: prevMembershipProductId
      },
      data: {
        title: submitData.title,
        price: submitData.price,
        totalCount: submitData.totalCount,
        description: submitData.description,
        onSale: submitData.onSale,
        openedAt: submitData.openedAt,
        closedAt: submitData.closedAt
      },
      select: {
        id: true
      }
    })

    return {
      ok: true,
      data: {
        id: updatedMembershipProduct.id
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
    //그 외의 모든 에러
    return {
      ok: false,
      error:
        '데이터베이스 에러가 발생했습니다. 잠시 후 다시 시도해 주세요.' +
        error.message
    }
  }
}
