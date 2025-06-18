import { PageSubtitle, PageTitle } from "@/app/components/base/page_text";
import { getPtDetailForMember } from "./actions";
import { displayTime, formatDate } from "@/app/lib/utils";
import { AttendanceState, UserRole } from "@prisma/client";
import { ChatToUserButton } from "@/app/components/chat/chatToUserButton";

type Params = Promise<{ id: string }>;

export default async function MemberPtDetailPage(props: { params: Params }) {
  const params = await props.params;
  const { id } = params;

  const { pt, userId } = await getPtDetailForMember(id);

  if (!pt) {
    return (
      <div>PT데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>
    );
  } else {
    const today = new Date();
    const startDate = pt.startDate;
    const expiredDate = new Date(
      startDate.setMonth(
        startDate.getMonth() +
          (pt.ptProduct.totalCount < 11
            ? 2
            : pt.ptProduct.totalCount < 21
            ? 3
            : 4)
      )
    );
    return (
      <div className="w-full flex flex-col">
        <PageSubtitle text="PT 신청 상세" />
        <div className="flex flex-col gap-2 p-3 border border-transparent rounded-md shadow-lg">
          <div className="flex gap-2">
            <span className="font-bold">{pt.ptProduct.title}</span>
            <span>회당 {pt.ptProduct.time}시간</span>
            <span>총 {pt.ptProduct.totalCount}회 </span>
          </div>
          <div className="TRAINER flex">
            <span className="font-bold">{pt.trainer?.user.username}</span>
            <span></span>
          </div>
          {pt.isActive === false ? (
            <ChatToUserButton
              userIdA={userId}
              userIdB={pt.trainer!.user.id}
              role={UserRole.MEMBER}
              title={`${pt.trainer?.user.username}님과 채팅하기`}
            />
          ) : null}
          <div className="flex flex-col gap-2">
            <span>스케줄</span>
            <div className="flex flex-col gap-2">
              {pt.ptRecord.map((record, index) => {
                const startTime = record.ptSchedule.startTime;
                const endTime = record.ptSchedule.endTime;
                const date = record.ptSchedule.date;

                const dateString = formatDate(date);
                const isPast = date < today;
                const isToday = date.getTime() === today.getTime();

                return (
                  <div
                    key={record.id}
                    className={`flex flex-col gap-2 p-3  ${
                      isPast
                        ? "bg-gray-200"
                        : isToday
                        ? "bg-yellow-100"
                        : "bg-blue-50"
                    }`}
                  >
                    <div className="collapse collapse-arrow">
                      <input type="radio" name="my-accordion-1" />
                      <div className="flex gap-2 collapse-title ">
                        <span>{dateString}</span>
                        <span>
                          {displayTime(startTime)} - {displayTime(endTime)}
                        </span>
                      </div>
                      <div className="collapse-content">
                        {record.attended === AttendanceState.ATTENDED ? (
                          <>
                            <span>기록</span>
                            <div className="flex flex-col">
                              {[1, 2, 3].map((n) => {
                                return (
                                  <div key={n}>
                                    <span>{"렛풀다운"}</span>
                                    <span>{3}세트</span>
                                    <span>{12}회</span>
                                    <span>{30}kg</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <span>기록이 없습니다.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {pt.ptProduct.totalCount > pt.ptRecord.length && (
            <div className="flex flex-col gap-2 bg-red-100 p-3 rounded-md">
              <div className="flex">
                <span>신청하지 않은 수업 횟수</span>
                <span className="text-red-500 font-bold ml-2">
                  {pt.ptProduct.totalCount - pt.ptRecord.length + 2}
                </span>
                <span>회</span>
              </div>
              <p>
                신청기한이 만료되기 전에 수업을 신청해주세요. 기한이 지나면
                기회는 소멸됩니다.
              </p>
              <div className="flex gap-2">
                <span>수업 마감일 :</span>
                <span>{formatDate(expiredDate)}</span>
              </div>
              <div className="flex justify-center">
                <span className="font-bold text-sm">
                  수업 마감일 까지 수업이 가능합니다.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
