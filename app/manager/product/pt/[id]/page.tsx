import { redirect } from 'next/navigation'
import { getPtProduct } from './edit/actions'
import Link from 'next/link'

type Params = Promise<{ id: string }>

const PtProductDetail = async (props: { params: Params }) => {
  const params = await props.params
  const id = params.id
  if (!id) {
    redirect('/manager/product/pt')
  }
  const ptProduct = await getPtProduct(id)
  if (!ptProduct) {
    redirect('/manager/product/pt')
  }
  return (
    <div className="flex w-full flex-col rounded-lg bg-white p-6 shadow-md">
      <div className="flex w-full justify-between">
        <h1 className="mb-4 text-3xl font-bold">{ptProduct.title}</h1>
        <div className="flex gap-2">
          <Link href="/manager/product/pt">
            <button className="btn btn-sm">목록으로</button>
          </Link>
          <Link href={`/manager/product/pt/${ptProduct.id}/edit`}>
            <button className="btn btn-primary btn-sm">수정하기</button>
          </Link>
        </div>
      </div>
      <div className="mb-2">
        <span className="font-semibold">ID:</span> {ptProduct.id}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Price:</span> ₩{ptProduct.price}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Total Count:</span>{' '}
        {ptProduct.totalCount}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Description:</span>{' '}
        {ptProduct.description}
      </div>
      <div className="mb-2">
        <span className="font-semibold">On Sale:</span>{' '}
        {ptProduct.onSale ? 'Yes' : 'No'}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Time:</span> {ptProduct.time} minutes
      </div>
      <div className="mb-2">
        <span className="font-semibold">Opened At:</span>{' '}
        {new Date(ptProduct.openedAt).toLocaleDateString()}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Closed At:</span>{' '}
        {new Date(ptProduct.closedAt).toLocaleDateString()}
      </div>
      <div className="mt-4">
        <h2 className="mb-2 text-2xl font-semibold">Trainers</h2>
        <ul className="list-inside list-disc">
          {ptProduct.trainers.map(trainer => (
            <li key={trainer.trainerId}>
              {trainer.username} (ID: {trainer.trainerId})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default PtProductDetail
