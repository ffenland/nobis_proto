import { getMemberInfo, IMainMember } from './actions'
import { styleClassName } from '@/app/lib/constants'
import Link from 'next/link'

const Home = async () => {
  const response = await getMemberInfo()

  if (response.ok === true) {
    return (
      <main className="flex w-full flex-col gap-3">
        <div className={`flex ${styleClassName.cardbox}`}>
          <span>{response.data.username}</span>
          <span className="">님 안녕하세요.</span>
        </div>
        <div>
          <Link href="/member/pt/new">
            <div className="btn">PT신청</div>
          </Link>
        </div>
      </main>
    )
  } else if (response.ok === false) {
    return (
      <main className="flex w-full flex-col gap-3">
        <div className={`flex ${styleClassName.cardbox}`}>
          <span>로그인이 필요합니다.</span>
        </div>
      </main>
    )
  }
}

export default Home
