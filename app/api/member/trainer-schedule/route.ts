// app/api/member/trainer-schedule/route.ts (기존 파일 업데이트)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getTrainerScheduleService } from "@/app/lib/services/schedule.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get("trainerId");
    const targetDate = searchParams.get("targetDate");

    if (!trainerId) {
      return NextResponse.json(
        { error: "trainerId가 필요합니다." },
        { status: 400 }
      );
    }

    const date = targetDate ? new Date(targetDate) : new Date();
    const schedule = await getTrainerScheduleService(trainerId, date);

    // DaySchedule 형태로 변환
    const daySchedule: { [key: string]: number[] } = {};

    // 기존 스케줄 추가
    schedule.existingSchedules.forEach((existing) => {
      const dateKey = existing.date.toISOString().split("T")[0];
      if (!daySchedule[dateKey]) daySchedule[dateKey] = [];

      // 30분 단위로 시간 슬롯 생성
      for (
        let time = existing.startTime;
        time < existing.endTime;
        time = addThirtyMinutes(time)
      ) {
        daySchedule[dateKey].push(time);
      }
    });

    // 트레이너 OFF 추가
    schedule.trainerOffs.forEach((off) => {
      if (!off.date) return;
      const dateKey = off.date.toISOString().split("T")[0];
      if (!daySchedule[dateKey]) daySchedule[dateKey] = [];

      for (
        let time = off.startTime;
        time < off.endTime;
        time = addThirtyMinutes(time)
      ) {
        daySchedule[dateKey].push(time);
      }
    });

    // 반복 OFF 추가 (3개월치)
    const startDate = schedule.dateRange.start;
    const endDate = schedule.dateRange.end;

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0];
      const weekDay = d.getDay();

      schedule.repeatOffs.forEach((repeatOff) => {
        const weekDayMap: { [key: string]: number } = {
          SUN: 0,
          MON: 1,
          TUE: 2,
          WED: 3,
          THU: 4,
          FRI: 5,
          SAT: 6,
        };

        if (repeatOff.weekDay && weekDayMap[repeatOff.weekDay] === weekDay) {
          if (!daySchedule[dateKey]) daySchedule[dateKey] = [];

          for (
            let time = repeatOff.startTime;
            time < repeatOff.endTime;
            time = addThirtyMinutes(time)
          ) {
            daySchedule[dateKey].push(time);
          }
        }
      });
    }

    return NextResponse.json(daySchedule);
  } catch (error) {
    console.error("Trainer Schedule 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 30분 추가 헬퍼 함수
function addThirtyMinutes(time: number): number {
  const hour = Math.floor(time / 100);
  const minute = time % 100;

  if (minute === 30) {
    return (hour + 1) * 100;
  } else {
    return time + 30;
  }
}
