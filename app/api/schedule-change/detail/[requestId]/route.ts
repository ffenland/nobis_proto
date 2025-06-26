// app/api/schedule-change/detail/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { requestId } = params;

    if (!requestId) {
      return NextResponse.json(
        { error: "요청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const scheduleChangeRequest =
      await prisma.ptScheduleChangeRequest.findUnique({
        where: { id: requestId },
        include: {
          requestor: {
            select: { username: true },
          },
          responder: {
            select: { username: true },
          },
          ptRecord: {
            include: {
              ptSchedule: true,
              pt: {
                include: {
                  member: {
                    include: { user: { select: { id: true, username: true } } },
                  },
                  trainer: {
                    include: { user: { select: { id: true, username: true } } },
                  },
                  ptProduct: {
                    select: { title: true },
                  },
                },
              },
            },
          },
        },
      });

    if (!scheduleChangeRequest) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 체크 - 관련자만 조회 가능
    const memberUserId = scheduleChangeRequest.ptRecord.pt.member?.user.id;
    const trainerUserId = scheduleChangeRequest.ptRecord.pt.trainer?.user.id;

    if (session.id !== memberUserId && session.id !== trainerUserId) {
      return NextResponse.json(
        { error: "해당 요청을 조회할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const response = {
      id: scheduleChangeRequest.id,
      state: scheduleChangeRequest.state,
      reason: scheduleChangeRequest.reason,
      responseMessage: scheduleChangeRequest.responseMessage,
      createdAt: scheduleChangeRequest.createdAt.toISOString(),
      respondedAt: scheduleChangeRequest.respondedAt?.toISOString(),
      expiresAt: scheduleChangeRequest.expiresAt.toISOString(),
      requestorName: scheduleChangeRequest.requestor.username,
      responderName: scheduleChangeRequest.responder?.username,
      isMyRequest: scheduleChangeRequest.requestorId === session.id,
      canRespond:
        scheduleChangeRequest.requestorId !== session.id &&
        scheduleChangeRequest.state === "PENDING" &&
        new Date() < scheduleChangeRequest.expiresAt,
      ptInfo: {
        id: scheduleChangeRequest.ptRecord.pt.id,
        title: scheduleChangeRequest.ptRecord.pt.ptProduct.title,
        memberName: scheduleChangeRequest.ptRecord.pt.member?.user.username,
        trainerName: scheduleChangeRequest.ptRecord.pt.trainer?.user.username,
      },
      currentSchedule: {
        date: scheduleChangeRequest.ptRecord.ptSchedule.date.toISOString(),
        startTime: scheduleChangeRequest.ptRecord.ptSchedule.startTime,
        endTime: scheduleChangeRequest.ptRecord.ptSchedule.endTime,
      },
      requestedSchedule: {
        date: scheduleChangeRequest.requestedDate.toISOString(),
        startTime: scheduleChangeRequest.requestedStartTime,
        endTime: scheduleChangeRequest.requestedEndTime,
      },
    };

    return NextResponse.json({
      success: true,
      request: response,
    });
  } catch (error) {
    console.error("일정 변경 요청 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
