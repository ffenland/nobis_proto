import { getPtRecordInfo } from "./actions";
import PtRecordWriter from "./PtRecordWriter";

type Params = Promise<{ id: string }>;

const Page = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const ptRecord = await getPtRecordInfo(id);

  // 기존의 기록은 server action으로 불러와서 전달한다.
  // 새로운 기록은 PtRecordWriter

  if (
    !ptRecord ||
    ptRecord.pt.member === null ||
    ptRecord.pt.trainer === null ||
    ptRecord.pt.trainer.fitnessCenterId === null
  ) {
    return <div>PT 기록을 찾을 수 없습니다.</div>;
  }

  return <PtRecordWriter ptRecordId={id} />;
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="PTINFO">
        <div className="flex  gap-2">
          <span>회원명</span>
          <span>{ptRecord.pt.member.user.username}</span>
        </div>
        <div className="flex  gap-2">
          <span>센터명</span>
          <span>{ptRecord.pt.trainer.fitnessCenter.title}</span>
        </div>
      </div>
    </div>
  );
};

export default Page;
