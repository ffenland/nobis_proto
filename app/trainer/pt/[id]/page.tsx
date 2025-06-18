import Image from "next/image";
import Link from "next/link";
import { getPtDetail, goToChatWithMember, submitPendingPt } from "./actions";
import {
  displayTime,
  formatDate,
  formatDateThisYear,
  getTailwindColorHex,
  getWeekDayMapData,
  getWeekDayMapDataByWeekDayEnum,
} from "@/app/lib/utils";
import { calculateEndDate } from "@/app/lib/product";

type Params = Promise<{ id: string }>;
const PtDetail = async (props: { params: Params }) => {
  const params = await props.params;

  const pt = await getPtDetail(params.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!pt) {
    return <div className="text-center py-10">PT를 찾을 수 없습니다.</div>;
  } else {
    return (
      <div className="max-w-2xl mx-auto p-2 flex flex-col gap-6">
        {/* 프로그램 카드 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-2 p-3">
            <h2 className="card-title text-lg md:text-xl">
              {pt.ptProduct.title}
            </h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge badge-outline">
                1회 {pt.ptProduct.time}시간
              </span>
              <span className="badge badge-outline">
                총 {pt.ptProduct.totalCount}회
              </span>
              <span className="badge badge-outline">
                {pt.ptProduct.price.toLocaleString()}원
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {pt.ptProduct.description}
            </p>
          </div>
        </div>

        {/* 회원 정보 카드 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body flex-row items-center gap-4 p-2">
            <div>
              <Image
                src={pt.member?.user.avatar || "/images/default_profile.jpg"}
                alt="user"
                width={56}
                height={56}
                className="rounded-full border"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-base">
                {pt.member?.user.username}
              </span>
              <span className="text-xs text-gray-500">
                가입일: {pt.member ? formatDate(pt.member.user.createdAt) : "-"}
              </span>
            </div>
            {/* 카드 안에 작게 채팅하기 버튼 */}
            <form action={goToChatWithMember} className="">
              <input type="hidden" name="ptId" value={params.id} />
              <button
                className="btn btn-xs btn-outline btn-secondary"
                type="submit"
              >
                채팅하기
              </button>
            </form>
          </div>
        </div>

        {/* 스케줄 카드 */}
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-2 p-2">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              <span className="font-bold text-base">
                {pt.isRegular ? "정기 PT" : "비정기 PT"} 신청
              </span>
              {pt.isRegular && (
                <span className="badge badge-info">
                  주 {pt.weekTimes.length}회
                </span>
              )}
            </div>
            {pt.isRegular && (
              <div className="flex flex-wrap gap-2 mt-1">
                {pt.weekTimes.map((weekTime, idx: number) => {
                  const weekDayMapData = getWeekDayMapDataByWeekDayEnum(
                    weekTime.weekDay
                  );
                  return (
                    <span
                      key={idx}
                      className="badge border-0 px-1"
                      style={{
                        borderBottom: `2.5px solid ${
                          weekDayMapData?.color
                            ? getTailwindColorHex(weekDayMapData.color)
                            : "#888"
                        }`,
                        borderRadius: 0,
                        paddingBottom: 0,
                      }}
                    >
                      {weekDayMapData?.kor.long}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <span>
                시작일:{" "}
                <span className="font-bold">
                  {formatDateThisYear(pt.startDate)}
                </span>
              </span>
              {pt.isRegular && (
                <span>
                  PT 마감일:{" "}
                  <span className="font-bold">
                    {formatDateThisYear(
                      calculateEndDate({
                        startDate: pt.startDate,
                        totalCount: pt.ptProduct.totalCount,
                        enuriDay: 0,
                      })
                    )}
                  </span>
                </span>
              )}
            </div>
            <div className="divider my-1" />
            <div className="flex gap-2 items-center">
              <span className="font-bold">신청 스케줄</span>
              <span className="badge badge-outline">
                {pt.ptRecord.length}회
              </span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {pt.ptRecord
                .sort((a, b) => {
                  const aDate = new Date(a.ptSchedule.date);
                  aDate.setHours(0, 0, 0, 0);
                  const bDate = new Date(b.ptSchedule.date);
                  bDate.setHours(0, 0, 0, 0);

                  // 오늘 날짜인 경우 맨 위로
                  if (
                    aDate.getTime() === today.getTime() &&
                    bDate.getTime() !== today.getTime()
                  )
                    return -1;
                  if (
                    bDate.getTime() === today.getTime() &&
                    aDate.getTime() !== today.getTime()
                  )
                    return 1;

                  // 나머지는 기존 정렬 로직
                  if (aDate.getTime() === bDate.getTime()) {
                    return a.ptSchedule.startTime - b.ptSchedule.startTime;
                  }
                  return aDate.getTime() - bDate.getTime();
                })
                .map((schedule, idx: number) => {
                  const weekDayMapData = getWeekDayMapData(
                    schedule.ptSchedule.date
                  );
                  return (
                    <Link
                      href={`/trainer/ptrecord/${schedule.id}`}
                      key={idx}
                      className="flex flex-col md:flex-row md:items-center md:gap-4 border rounded bg-base-200 px-3 py-2 hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <div className="flex gap-2 items-center">
                        <span className="font-bold">
                          {formatDateThisYear(schedule.ptSchedule.date)}
                        </span>
                        <span
                          className="badge border-0 px-1"
                          style={{
                            borderBottom: `2.5px solid ${
                              weekDayMapData?.color
                                ? getTailwindColorHex(weekDayMapData.color)
                                : "#888"
                            }`,
                            borderRadius: 0,
                            paddingBottom: 0,
                          }}
                        >
                          {weekDayMapData.kor.long}
                        </span>
                        {schedule.ptSchedule.date === today ? (
                          <span className="badge bg-pink-500 text-white font-bold p-2">
                            오늘
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2 items-center text-sm">
                        <span>
                          {displayTime(schedule.ptSchedule.startTime)}
                        </span>
                        <span>
                          ~ {displayTime(schedule.ptSchedule.endTime)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex items-center justify-center  gap-2 mt-2">
          {pt.trainerConfirmed === false && (
            <form action={submitPendingPt} className="flex-1">
              <input type="hidden" name="ptId" value={params.id} />
              <button className="btn btn-primary w-full">승인하기</button>
            </form>
          )}
        </div>
      </div>
    );
  }
};

export default PtDetail;
