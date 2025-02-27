import dayjs from 'dayjs'
import { getPtList } from './actions'

const MemberPtPage = async () => {
  const ptList = await getPtList()
  console.log(ptList)
  return (
    <div>
      <div>PT신청 목록</div>
      {ptList.map(pt => {
        const startDate = dayjs(pt.startDate)
        return (
          <div key={pt.id}>
            <div>{pt.ptProduct.title}</div>
            <div>{pt.trainer?.user.username}</div>
            <div>{startDate.format('YYYY년 MM월 DD일')}</div>
            <div>{pt.isActive ? '진행중' : '종료'}</div>
          </div>
        )
      })}
    </div>
  )
}

export default MemberPtPage
