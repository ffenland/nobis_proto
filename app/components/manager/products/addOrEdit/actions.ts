'use server'

import prisma from '@/app/lib/prisma'
import { Prisma } from '@prisma/client'

export type IEditPtProduct = NonNullable<
  Prisma.PromiseReturnType<typeof getPtProduct>
>

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
          id: true
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
      trainers: ptProduct.trainer.map(trainer => {
        return {
          id: trainer.id
        }
      })
    }
  }
}
