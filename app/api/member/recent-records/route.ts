// app/api/member/recent-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { AttendanceState } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const recentRecords = await prisma.ptRecord.findMany({
      where: {
        pt: {
          memberId: session.roleId,
        },
        attended: AttendanceState.ATTENDED,
        ptSchedule: {
          date: {
            lt: new Date(),
          },
        },
      },
      select: {
        id: true,
        ptSchedule: {
          select: {
            date: true,
          },
        },
        pt: {
          select: {
            trainer: {
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
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        ptSchedule: {
          date: "desc",
        },
      },
      take: 10,
    });

    const formattedRecords = recentRecords.map((record) => ({
      id: record.id,
      date: record.ptSchedule.date.toISOString(),
      exerciseCount: record.items.length,
      trainerName: record.pt.trainer?.user.username || "알 수 없음",
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error("Recent records 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
