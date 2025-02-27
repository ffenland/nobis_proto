import prisma from '@/app/lib/prisma'
import Link from 'next/link'

const MembershipProductDetail = async () => {
  const getMembershipProduct = async () => {
    'use server'
    return await prisma.membershipProduct.findMany({
      select: {
        id: true,
        title: true,
        onSale: true,
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
  }
  const membershipList = await getMembershipProduct()
  return (
    <div className="flex w-full flex-col">
      <div className="flex justify-between">
        <div className="title">
          <span className="text-xl font-bold">현재 등록된 회원권 상품</span>
        </div>
        <Link href="/manager/product/membership/new">
          <button className="btn btn-primary">신규 등록</button>
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {membershipList.map(membership => (
          <Link
            key={membership.id}
            href={`/manager/product/membership/${membership.id}`}>
            <div className="flex flex-col gap-2 rounded-md border p-2">
              <div className="flex justify-between">
                <div className="text-lg font-bold">
                  <span>{membership.title}</span>
                </div>
                <div>
                  <div className="rounded-md bg-red-500 p-1 text-sm text-white">
                    {membership.onSale ? '판매중' : '미판매'}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default MembershipProductDetail
