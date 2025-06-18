import { UserRole } from "@prisma/client";
import MainHeader from "../components/base/main_header";
import {
  welcomeTrainer,
  getTodayPtRecords,
  getPendingPtCount,
  getUnreadChatCount,
} from "./actions";
import Link from "next/link";
import { displayTime, formatDate } from "../lib/utils";

const TrainerMain = async () => {
  const [trainer, todayRecords, pendingCount, unreadChatCount] =
    await Promise.all([
      welcomeTrainer(),
      getTodayPtRecords(),
      getPendingPtCount(),
      getUnreadChatCount(),
    ]);
  if (!trainer) {
    return <div>트레이너 정보를 찾을 수 없습니다.</div>;
  }

  const allSchedules = trainer.pt.flatMap((ptClass) =>
    ptClass.ptRecord.map((record) => ({
      member: ptClass.member ? ptClass.member.user.username : "미확인 사용자",
      date: record.ptSchedule.date,
      startTime: record.ptSchedule.startTime,
      trainerConfirmed: ptClass.trainerConfirmed,
    }))
  );

  allSchedules.sort((a, b) => {
    if (a.date.getTime() === b.date.getTime()) {
      return a.startTime - b.startTime;
    }
    return a.date.getTime() - b.date.getTime();
  });

  const today = new Date();
  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isTomorrow = (date: Date) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex w-full flex-col">
      <div>
        {trainer?.user ? (
          <MainHeader
            username={trainer?.user.username}
            role={UserRole.TRAINER}
          />
        ) : null}
      </div>

      <div className="m-5 flex flex-col gap-4">
        <div className="flex justify-between gap-2">
          <Link
            href="/trainer/pt"
            className="card bg-base-200 shadow-xl hover:bg-base-300 transition-colors"
          >
            <div className="card-body">
              <h2 className="card-title">대기중인 PT</h2>
              <p className="text-3xl font-bold">{pendingCount}건</p>
            </div>
          </Link>

          <Link
            href="/trainer/chat"
            className="card bg-base-200 shadow-xl hover:bg-base-300 transition-colors"
          >
            <div className="card-body">
              <h2 className="card-title">읽지 않은 메시지</h2>
              <p className="text-3xl font-bold">{unreadChatCount}건</p>
            </div>
          </Link>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">오늘의 수업</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayRecords.map((record) => (
                <Link
                  href={`/trainer/pt/${record.pt.id}`}
                  key={record.id}
                  className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg">
                      {record.pt.member?.user.username ?? "알 수 없음"}
                    </h3>
                    <p className="text-sm">
                      {formatTime(record.ptSchedule.startTime)} -{" "}
                      {formatTime(record.ptSchedule.endTime)}
                    </p>
                    <div
                      className="badge badge-lg"
                      data-theme={
                        record.attended === "ATTENDED"
                          ? "success"
                          : record.attended === "ABSENT"
                          ? "error"
                          : "info"
                      }
                    >
                      {record.attended === "ATTENDED"
                        ? "완료"
                        : record.attended === "ABSENT"
                        ? "불참"
                        : "예정"}
                    </div>
                  </div>
                </Link>
              ))}
              {todayRecords.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  오늘 예정된 수업이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-2">이번 주 예정된 수업</h2>
            {allSchedules.length > 0 ? (
              <div className="flex flex-col gap-2">
                {allSchedules.map((schedule, index) => (
                  <div
                    key={index}
                    className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-md px-1 py-2 bg-base-200 ${
                      isToday(schedule.date)
                        ? "border-red-300"
                        : isTomorrow(schedule.date)
                        ? "border-amber-300"
                        : "border-base-200"
                    }`}
                  >
                    <div className="flex gap-2 items-center">
                      <span className="font-bold">
                        {schedule.member} 회원님
                      </span>
                      <span className="badge badge-success">확정</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span>{formatDate(schedule.date)}</span>
                      <span>{displayTime(schedule.startTime)}</span>
                      {isToday(schedule.date) && (
                        <span className="badge badge-error">오늘</span>
                      )}
                      {isTomorrow(schedule.date) && (
                        <span className="badge badge-warning">내일</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 border rounded-md bg-gray-200 border-transparent text-center">
                <span>이번 주는 수업이 없습니다 ㅠㅠ</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerMain;
