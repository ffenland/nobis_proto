'use server'
import prisma from '@/app/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  INewPtProductSubmitResult,
  IPtProductSubmitData
} from '@/app/manager/product/pt/new/actions'

export type IPtProductForEdit = NonNullable<
  Prisma.PromiseReturnType<typeof getPtProduct>
>

export type IPtProductSubmitDataOptional = Partial<
  Omit<IPtProductSubmitData, 'onSale'>
> & {
  onSale?: boolean
}

export const getPtProduct = async (ptId: string) => {
  const ptProduct = await prisma.ptProduct.findUnique({
    where: {
      id: ptId
    },
    select: {
      id: true,
      title: true,
      price: true,
      totalCount: true,
      description: true,
      onSale: true,
      openedAt: true,
      closedAt: true,
      time: true,
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              username: true
            }
          }
        }
      }
    }
  })
  if (!ptProduct) {
    return null
  } else {
    return {
      id: ptProduct.id,
      title: ptProduct.title,
      price: ptProduct.price,
      totalCount: ptProduct.totalCount,
      description: ptProduct.description,
      onSale: ptProduct.onSale,
      time: ptProduct.time,
      openedAt: ptProduct.openedAt,
      closedAt: ptProduct.closedAt,
      trainers: ptProduct.trainer.map(trainer => ({
        trainerId: trainer.id,
        username: trainer.user.username
      }))
    }
  }
}

interface IEditPtProductSubmitData
  extends Omit<IPtProductSubmitDataOptional, 'trainers'> {
  trainer?: { set: { id: string }[] }
}

export const editPtProductSubmit = async ({
  ptProductId,
  submitData
}: {
  ptProductId: string
  submitData: IPtProductSubmitDataOptional
}): Promise<INewPtProductSubmitResult> => {
  try {
    // find previous ptProduct
    let refinedData: IEditPtProductSubmitData = {}

    const tempData: IPtProductSubmitDataOptional & {
      trainer?: { set: { id: string }[] }
    } = { ...submitData }
    if (submitData.trainers) {
      tempData.trainer = {
        set: submitData.trainers.map(trainer => ({ id: trainer.trainerId }))
      }
      delete tempData.trainers
    }

    refinedData = { ...tempData }

    const updatedPtProduct = await prisma.ptProduct.update({
      where: {
        id: ptProductId
      },
      data: { ...refinedData },
      select: { id: true }
    })

    return {
      ok: true,
      data: {
        id: updatedPtProduct.id
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
