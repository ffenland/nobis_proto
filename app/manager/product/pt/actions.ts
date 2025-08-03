'use server'

import prisma from '@/app/lib/prisma'

export const getPtProductList = async () => {
  const ptProducts = await prisma.ptProduct.findMany({
    select: {
      id: true,
      title: true,
      onSale: true
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ptProducts.sort((a, b) => (a.onSale === true ? -1 : 1)) // 판매중인 상품을 위로
  return ptProducts
}
