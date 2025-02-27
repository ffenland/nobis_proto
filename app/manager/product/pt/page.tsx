import Link from 'next/link'
import { getPtProductList } from './actions'

const PtProductList = async () => {
  const ptProducts = await getPtProductList()
  const onSaleList = ptProducts.filter(ptProduct => ptProduct.onSale === true)
  const offSaleList = ptProducts.filter(ptProduct => ptProduct.onSale === false)
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="text-center">
        <span>PT상품 List</span>
      </div>
      <span className="ml-3">판매중</span>
      {onSaleList.map(ptProduct => (
        <Link
          key={ptProduct.id}
          href={`/manager/product/pt/${ptProduct.id}`}>
          <div className="flex w-full flex-col rounded-md border p-2">
            <span>{ptProduct.title}</span>
          </div>
        </Link>
      ))}
      <span className="ml-3">판매중지</span>
      {offSaleList.map(ptProduct => (
        <Link
          key={ptProduct.id}
          href={`/manager/product/pt/${ptProduct.id}`}>
          <div className="flex w-full flex-col">
            <span>{ptProduct.title}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default PtProductList
