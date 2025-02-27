import { styleClassName } from '@/app/lib/constants'
import {
  formatDate,
  formatNumberWithCommas,
  isPastCheck
} from '@/app/lib/utils'
import { IMembershipProduct } from '@/app/manager/product/membership/actions'
import Link from 'next/link'

const MembershipProduct = ({
  membership,
  onClickSet
}: {
  membership: IMembershipProduct
  onClickSet?: {
    title: string
    link: string
  }
}) => {
  return (
    <div
      key={membership.id}
      className={`${styleClassName.cardbox} flex flex-col gap-2 p-2 shadow-md`}>
      <div className="flex justify-between">
        <div className="TITLE text-lg font-bold">
          <span>{membership.title}</span>
        </div>
        <div className="SALE">
          {!membership.onSale || isPastCheck(membership.closedAt) ? (
            <div className="rounded-md bg-red-500 p-1 text-sm text-white">
              미판매
            </div>
          ) : (
            <div className="rounded-md bg-green-500 p-1 text-sm text-white">
              판매중
            </div>
          )}
        </div>
      </div>
      <div className="PRICE COUNT flex justify-start gap-4">
        <div className="PRICE flex gap-1">
          <span className="font-bold">가격 </span>
          <span>{formatNumberWithCommas(membership.price)}</span>
          <span>원</span>
        </div>
        <div className="COUNT flex gap-1">
          <span className="font-bold">횟수 </span>
          <span>{membership.totalCount}</span>
          <span>회</span>
        </div>
      </div>
      <div className="OPEN CLOSE flex flex-col">
        <span className="font-bold">판매기간</span>
        <div className="flex">
          <span>{formatDate(membership.openedAt)}</span>
          <span> ~</span>
          <span>{formatDate(membership.closedAt)}</span>
        </div>
      </div>
      <div className="DESCRIPTION flex flex-col">
        <span className="font-bold">상세설명</span>
        <p className="whitespace-pre-wrap">{membership.description}</p>
      </div>

      {onClickSet ? (
        <Link
          href={onClickSet.link}
          className="EDIT flex items-center justify-center">
          <button className="btn bg-slate-600 text-white">
            {onClickSet.title}
          </button>
        </Link>
      ) : null}
    </div>
  )
}

export default MembershipProduct
