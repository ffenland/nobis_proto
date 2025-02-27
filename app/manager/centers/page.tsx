import { getCenterSummaries, ICenterSummary } from './actions'

const CenterCardForManager = ({ center }: { center: ICenterSummary }) => {}

const CenterSummary = async () => {
  // 센터의 운영정보를 띄워주자.
  const centerInfo = await getCenterSummaries()
  return <div>CenterSummary</div>
}

export default CenterSummary
