import { redirect } from 'next/navigation'
import Link from 'next/link'

type Params = Promise<{ id: string }>

const MembershipProductDetail = async (props: { params: Params }) => {
  const params = await props.params
  const id = params.id
  if (!id) {
    redirect('/manager/product/membership')
  }

  if (!id) {
    redirect('/manager/product/membership')
  }
  return (
    <div className="flex w-full flex-col">
      <span>id is {id}</span>
      <Link href={`/manager/product/membership/${id}/edit`}>
        <button className="btn">Edit</button>
      </Link>
    </div>
  )
}

export default MembershipProductDetail
