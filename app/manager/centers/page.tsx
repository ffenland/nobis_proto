import Link from "next/link";
import { getCenterSummaries, ICenterSummary } from "./actions";
import { displayTime } from "@/app/lib/utils";

const CenterCardForManager = ({ center }: { center: ICenterSummary }) => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{center.title}</h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">주소:</span>
            <span>{center.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">연락처:</span>
            <span>{center.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">설명:</span>
            <span>{center.description}</span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">트레이너</div>
            <div className="stat-value">{center.trainers.length}</div>
          </div>

          <div className="stat">
            <div className="stat-title">진행중인 PT</div>
            <div className="stat-value">{center.ptCount}</div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="stats shadow flex gap-2 justify-center p-3">
          <Link
            href={`/manager/centers/${center.id}/facilities/machine`}
            className=" btn btn-outline"
          >
            머신 관리하기
          </Link>
          <Link
            href={`/manager/centers/${center.id}/facilities/tool`}
            className="btn  btn-outline"
          >
            기구 관리하기
          </Link>
        </div>

        <div className="divider"></div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold">운영시간</span>
          <div className="flex flex-col gap-1">
            {center.openingHours.map((hour) => (
              <div key={hour.dayOfWeek} className="flex justify-between">
                <span>{hour.dayOfWeek}</span>
                <span>
                  {displayTime(hour.openTime)} ~ {displayTime(hour.closeTime)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/manager/centers/${center.id}/edit`}
            className="btn btn-primary"
          >
            센터 정보 수정
          </Link>
        </div>
      </div>
    </div>
  );
};

const CenterSummary = async () => {
  const centersInfo = await getCenterSummaries();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">센터 현황</h1>
        <Link href="/manager/centers/new" className="btn btn-primary">
          새 센터 등록
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {centersInfo.map((center) => (
          <CenterCardForManager key={center.id} center={center} />
        ))}
      </div>
    </div>
  );
};

export default CenterSummary;
