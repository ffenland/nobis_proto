import Link from 'next/link'
import {
  getMembershipProductLookUpList,
  getPtProductLookUpList,
  IPtProductLookUp,
  IMembershipProductLookUp
} from './actions'

const PtProductLookup = ({
  ptProductLookupList
}: {
  ptProductLookupList: IPtProductLookUp[]
}) => {
  return (
    <div className="PTPRODUCT">
      <div>
        <span>PT 상품 목록</span>
      </div>
      <div className="grid w-full grid-cols-2 lg:grid-cols-4">
        <Link
          href={'/manager/products/pt/upsert'}
          className="cusor-pointer">
          <div>
            <span>PT 상품 추가</span>
          </div>
        </Link>
        {ptProductLookupList.map((ptProduct, index) => {
          return (
            <div
              key={ptProduct.id}
              className="flex w-full flex-col items-center justify-between">
              <div className="">{ptProduct.title}</div>
              <div className="">
                <span>현재 진행중인 회원 수</span>
                <span>{ptProduct._count.pt}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MembershipProductLookup = ({
  membershipProductLookupList
}: {
  membershipProductLookupList: IMembershipProductLookUp[]
}) => {
  return (
    <div className="MEMBERSHIPPRODUCT">
      <div>
        <span>멤버십 상품 목록</span>
      </div>
      <div className="grid w-full grid-cols-2 lg:grid-cols-4">
        <Link
          href={'/manager/products/membership/upsert'}
          className="cusor-pointer">
          <div>
            <span>회원권 상품 추가</span>
          </div>
        </Link>
        {membershipProductLookupList.map((membershipProduct, index) => {
          return (
            <div
              key={membershipProduct.id}
              className="flex w-full flex-col items-center justify-between">
              <div className="">{membershipProduct.title}</div>
              <div className="">
                <span>현재 사용중인 회원 수</span>
                <span>{membershipProduct._count.membership}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ProductSummary = async () => {
  const ptProductLookUpList = await getPtProductLookUpList()
  const membershipProductLookUpList = await getMembershipProductLookUpList()
  return (
    <div className="flex w-full flex-col">
      <div className="PTPRODUCT">
        <PtProductLookup ptProductLookupList={ptProductLookUpList} />
      </div>
      <div className="MEMBERSHIPPRODUCT">
        <MembershipProductLookup
          membershipProductLookupList={membershipProductLookUpList}
        />
      </div>
    </div>
  )
}

export default ProductSummary
