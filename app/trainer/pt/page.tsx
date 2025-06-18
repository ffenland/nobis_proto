import {
  convertKSTtoUTC,
  formatDateThisYear,
  formatTimeToString,
  getRemainText,
} from "@/app/lib/utils";
import { getPtList } from "./actions";
import { FaUser, FaRegClock, FaBookOpen } from "react-icons/fa";
import Link from "next/link";
import dayjs from "dayjs";

const TodayPts = async () => {};

const TrainerPt = async () => {
  const today = convertKSTtoUTC(new Date(new Date().setHours(0, 0, 0, 0)));
  const ptList = await getPtList();
  const memberIdCount: Record<string, number> = {};
  ptList.forEach((pt) => {
    if (pt.memberId) {
      memberIdCount[pt.memberId] = (memberIdCount[pt.memberId] || 0) + 1;
    }
  });
  ptList.sort((a, b) => {
    return a.date.getTime() - b.date.getTime();
  });

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="my-2 w-full px-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-1">
          진행중인 PT 수업
        </h1>
        <div className="h-1 w-full bg-primary rounded mb-2" />
      </div>
      {ptList.map((pt) => (
        <Link
          href={`/trainer/pt/${pt.ptId}`}
          key={pt.ptId}
          className="card bg-base-100 shadow-xl border"
        >
          <div className="card-body gap-2">
            <div className="flex items-center gap-3 mb-1">
              <FaUser className="text-primary" />
              <span className="font-bold text-base">{pt.memberName}님</span>
              {pt.memberId && memberIdCount[pt.memberId] > 1 && (
                <span className="badge badge-error text-xs">중복 회원</span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-1">
              <FaBookOpen className="text-secondary" />
              <span className="text-sm font-semibold">{pt.ptTitle}</span>
              <span className="badge badge-outline text-xs">
                {pt.order}번째 수업
              </span>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <FaRegClock className="text-accent" />
              <span className="text-sm">{formatDateThisYear(pt.date)}</span>
              {dayjs(pt.date).format("YYYY-MM-DD") ===
              dayjs(today).format("YYYY-MM-DD") ? (
                <span className="badge badge-accent badge-outline text-xs">
                  오늘 수업
                </span>
              ) : (
                <span className="badge badge-accent badge-outline text-xs">
                  {getRemainText(pt.date, pt.startTime)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">수업시간</span>
              <span>
                {formatTimeToString(
                  Math.floor(pt.startTime / 100),
                  pt.startTime % 100
                )}
              </span>
              <span>~</span>
              <span>
                {formatTimeToString(
                  Math.floor(pt.endTime / 100),
                  pt.endTime % 100
                )}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default TrainerPt;
