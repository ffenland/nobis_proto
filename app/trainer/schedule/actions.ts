"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "../../lib/session";
import { convertKSTtoUTC } from "../../lib/utils";
import { redirect } from "next/navigation";

export const getWeeklySchedule = async (startDate: Date) => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  // 주의 시작일과 종료일 계산 (월요일 ~ 토요일)
  const weekStart = new Date(startDate);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 아니면 1-day
  weekStart.setDate(weekStart.getDate() + diff); // 월요일로 설정
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // 토요일로 설정
  weekEnd.setHours(0, 0, 0, 0);

  // PT 스케줄
  const schedules = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId: roleId,
      },
      ptSchedule: {
        date: {
          gte: convertKSTtoUTC(weekStart),
          lte: convertKSTtoUTC(weekEnd),
        },
      },
    },
    select: {
      id: true,
      attended: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      pt: {
        select: {
          id: true,
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });
  console.log(schedules);

  // 트레이너 오프(1회성)
  const offs = await prisma.trainerOff.findMany({
    where: {
      trainerId: roleId,
      OR: [
        {
          date: {
            gte: convertKSTtoUTC(weekStart),
            lte: convertKSTtoUTC(weekEnd),
          },
        },
        {
          weekDay: { not: null },
        },
      ],
    },
    select: {
      date: true,
      weekDay: true,
      startTime: true,
      endTime: true,
    },
  });

  // 반복 오프를 실제 날짜로 변환
  const repeatOffs: { date: Date; startTime: number; endTime: number }[] = [];
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    offs.forEach((off) => {
      if (off.weekDay && dayOfWeek === weekDayToNumber(off.weekDay)) {
        repeatOffs.push({
          date: new Date(d),
          startTime: off.startTime,
          endTime: off.endTime,
        });
      }
    });
  }

  // 1회성 오프만 추출
  const singleOffs = offs
    .filter((off) => off.date)
    .map((off) => ({
      date: off.date!,
      startTime: off.startTime,
      endTime: off.endTime,
    }));

  // 합치기
  const allOffs = [...singleOffs, ...repeatOffs];

  return { schedules, offs: allOffs };
};

// weekDay enum을 숫자로 변환
function weekDayToNumber(weekDay: string) {
  switch (weekDay) {
    case "SUN":
      return 0;
    case "MON":
      return 1;
    case "TUE":
      return 2;
    case "WED":
      return 3;
    case "THU":
      return 4;
    case "FRI":
      return 5;
    case "SAT":
      return 6;
    default:
      return -1;
  }
}
