import dayjs from "dayjs";
import { getPtList, IPtList } from "./actions";
import { displayTime, getKoreanDayNameByEngShort } from "@/app/lib/utils";
import Link from "next/link";

const MemberPtPage = async () => {
  const ptList: IPtList = await getPtList();

  return (
    <div className="flex flex-col gap-2">
      <div>PT신청 목록</div>
      <div>세부 내용을 보시려면 눌러주세요</div>
      {ptList.map((pt) => {
        const startDate = dayjs(pt.startDate);

        return (
          <Link
            href={`/member/pt/${pt.id}`}
            key={pt.id}
            className="flex flex-col gap-2 border-2 p-2 m-2 rounded-md shadow-lg"
          >
            <div className="flex gap-2">
              <span>수업명 :</span>
              <span className="font-bold">{pt.ptProduct.title}</span>
            </div>
            <div className="flex gap-2">
              <span>트레이너 :</span>
              <span className="font-bold">
                {pt.trainer
                  ? pt.trainer.user.username
                  : "현재 근무중이 아닙니다."}
              </span>
            </div>
            <div className="flex gap-2">
              <span>첫 수업일 :</span>
              <span className="font-bold">
                {startDate.format("YYYY년 MM월 DD일")}
              </span>
            </div>
            {pt.isRegular ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <span>정기수업 :</span>
                  <span className="font-bold">주 {pt.weekTimes.length}회</span>
                </div>
                {pt.weekTimes.map((weekTime) => {
                  const startTime = displayTime(weekTime.startTime);
                  const endTime = displayTime(weekTime.endTime);
                  const weekName = getKoreanDayNameByEngShort(weekTime.weekDay);

                  return (
                    <div key={weekTime.weekDay} className="flex gap-2 ml-4">
                      <span>{weekName} -</span>
                      <span>
                        {startTime} - {endTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <span>비정기 수업</span>
              </div>
            )}
            <div>
              <span>수업 상태 : </span>

              {!pt.trainerConfirmed ? (
                <span className="font-bold text-amber-600">승인 대기중</span>
              ) : pt.isActive ? (
                <span className="font-bold text-green-600">수업 진행중</span>
              ) : (
                <span className="font-bold text-gray-600">수업 종료</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default MemberPtPage;
