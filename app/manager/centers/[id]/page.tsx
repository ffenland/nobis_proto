import Link from "next/link";
import { getCenterDetail } from "./actions";
import { displayTime, formatDateThisYear } from "@/app/lib/utils";
import { weekDayNumberStringMap } from "@/app/lib/constants";
import Image from "next/image";
import { weekdaysEnum } from "@/app/lib/constants";

type Params = Promise<{ id: string }>;

const FitnessCenterDetail = async (props: { params: Params }) => {
  const params = await props.params;
  const id = params.id;
  const center = await getCenterDetail(id);

  if (!center) {
    return <div>센터를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{center.title}</h1>
        <Link href={`/manager/centers/${id}/edit`} className="btn btn-primary">
          수정하기
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">기본 정보</h2>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">주소:</span> {center.address}
              </p>
              <p>
                <span className="font-semibold">전화번호:</span> {center.phone}
              </p>
              <p>
                <span className="font-semibold">설명:</span>{" "}
                {center.description || "없음"}
              </p>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">통계</h2>
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">회원 수</div>
                <div className="stat-value">{center._count.members}</div>
              </div>
              <div className="stat">
                <div className="stat-title">트레이너 수</div>
                <div className="stat-value">{center._count.trainers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 영업 시간 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">영업 시간</h2>
            <div className="space-y-2">
              {center.openingHours.map((hour) => {
                const dayNumber = weekdaysEnum.find(
                  (w) => w.enum === hour.dayOfWeek
                )?.key;
                return (
                  <div key={hour.id} className="flex justify-between">
                    <span>
                      {dayNumber !== undefined
                        ? weekDayNumberStringMap[dayNumber].kor.long
                        : hour.dayOfWeek}
                    </span>
                    <span>
                      {displayTime(hour.openTime)} -{" "}
                      {displayTime(hour.closeTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 트레이너 목록 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">트레이너 목록</h2>
            <div className="grid grid-cols-2 gap-4">
              {center.trainers.map((trainer) => (
                <div key={trainer.id} className="flex items-center gap-2">
                  <div className="avatar">
                    <div className="w-12 rounded-full">
                      <Image
                        src={
                          trainer.user.avatar || "/images/default-avatar.png"
                        }
                        alt={trainer.user.username}
                        width={48}
                        height={48}
                      />
                    </div>
                  </div>
                  <span>{trainer.user.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitnessCenterDetail;
