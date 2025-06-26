// app/api/member/recent-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { calculateAttendanceStatus } from "@/app/lib/utils/pt.utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 모든 PT 기록을 가져와서 계산된 출석 상태로 필터링
    const allPtRecords = await prisma.ptRecord.findMany({
      where: {
        pt: {
          memberId: session.roleId,
        },
        ptSchedule: {
          date: {
            lt: new Date(), // 과거 수업만
          },
        },
      },
      select: {
        id: true,
        ptSchedule: {
          select: {
            date: true,
            startTime: true,
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
    });

    const currentTime = new Date();

    // 계산된 출석 상태가 'ATTENDED'인 기록만 필터링
    const attendedRecords = allPtRecords.filter((record) => {
      const attendanceStatus = calculateAttendanceStatus(
        {
          ptSchedule: record.ptSchedule,
          items: record.items,
        },
        currentTime
      );
      return attendanceStatus === "ATTENDED";
    });

    // 최신 10개 기록만 선택
    const recentRecords = attendedRecords.slice(0, 10);

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
