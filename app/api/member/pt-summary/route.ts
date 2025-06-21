// app/api/member/pt-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const ptList = await prisma.pt.findMany({
      where: {
        memberId: session.roleId,
      },
      select: {
        id: true,
        ptProduct: {
          select: {
            title: true,
          },
        },
        isRegular: true,
        trainerConfirmed: true,
        state: true,
        trainer: {
          select: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        ptRecord: {
          where: {
            ptSchedule: {
              date: {
                gte: new Date(),
              },
            },
          },
          select: {
            ptSchedule: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              },
            },
          },
          orderBy: {
            ptSchedule: {
              date: "asc",
            },
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const ptSummary = ptList.map((pt) => ({
      id: pt.id,
      ptProduct: pt.ptProduct,
      trainer: pt.trainer,
      trainerConfirmed: pt.trainerConfirmed,
      state: pt.state,
      upcomingSession:
        pt.ptRecord.length > 0
          ? {
              date: pt.ptRecord[0].ptSchedule.date.toISOString(),
              startTime: pt.ptRecord[0].ptSchedule.startTime,
              endTime: pt.ptRecord[0].ptSchedule.endTime,
            }
          : undefined,
    }));

    return NextResponse.json(ptSummary);
  } catch (error) {
    console.error("PT summary 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
