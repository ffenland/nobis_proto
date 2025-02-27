'use server'

import prisma from '@/app/lib/prisma'
import { Prisma } from '@prisma/client'

export type IPtProductLookUp = Prisma.PromiseReturnType<
  typeof getPtProductLookUpList
>[number]

export type IMembershipProductLookUp = Prisma.PromiseReturnType<
  typeof getMembershipProductLookUpList
>[number]

export const getPtProductLookUpList = async () => {
  // pt상품 목록과, 현재 활성화된 pt 갯수를 표시해준다.
  const currentPtProduct = await prisma.ptProduct.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      _count: {
        select: {
          pt: {
            where: {
              isActive: true
            }
          }
        }
      }
    }
  })
  return currentPtProduct
}

export const getMembershipProductLookUpList = async () => {
  // pt상품 목록과, 현재 활성화된 pt 갯수를 표시해준다.
  const currentMembershipProduct = await prisma.membershipProduct.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      _count: {
        select: {
          membership: {
            where: {
              isActive: true
            }
          }
        }
      }
    }
  })
  return currentMembershipProduct
}
