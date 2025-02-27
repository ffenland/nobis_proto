import { redirect } from 'next/navigation'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export async function generateMetadata(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const id = searchParams.id
}

export default async function MemberPtDetailPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams
  const id = searchParams.id
  if (!id) {
    redirect('/member/')
  }

  return <div>your pt id is {id}</div>
}
