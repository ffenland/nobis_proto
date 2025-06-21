// app/api/member/pt-apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  applyPtService,
  IPtApplicationData,
} from "@/app/lib/services/pt-apply.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const {
      ptProductId,
      trainerId,
      startDate,
      isRegular,
      chosenSchedule,
      totalCount,
      message,
    } = body;

    // 필수 필드 검증
    if (
      !ptProductId ||
      !trainerId ||
      !startDate ||
      typeof isRegular !== "boolean" ||
      !chosenSchedule ||
      !totalCount
    ) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 날짜 유효성 검증
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜입니다." },
        { status: 400 }
      );
    }

    // 과거 날짜 체크
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedStartDate < today) {
      return NextResponse.json(
        { error: "과거 날짜로는 신청할 수 없습니다." },
        { status: 400 }
      );
    }

    // chosenSchedule 유효성 검증
    if (
      typeof chosenSchedule !== "object" ||
      Object.keys(chosenSchedule).length === 0
    ) {
      return NextResponse.json(
        { error: "스케줄이 선택되지 않았습니다." },
        { status: 400 }
      );
    }

    // totalCount 유효성 검증
    if (typeof totalCount !== "number" || totalCount < 1 || totalCount > 100) {
      return NextResponse.json(
        { error: "유효하지 않은 총 수업 횟수입니다. (1-100회)" },
        { status: 400 }
      );
    }

    // 스케줄 형식 검증
    for (const [dateStr, times] of Object.entries(chosenSchedule)) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: `유효하지 않은 날짜 형식입니다: ${dateStr}` },
          { status: 400 }
        );
      }

      if (!Array.isArray(times) || times.length === 0) {
        return NextResponse.json(
          { error: `${dateStr}에 대한 시간이 선택되지 않았습니다.` },
          { status: 400 }
        );
      }

      for (const time of times) {
        if (typeof time !== "number" || time < 600 || time > 2200) {
          return NextResponse.json(
            { error: `유효하지 않은 시간입니다: ${time} (06:00-22:00 범위)` },
            { status: 400 }
          );
        }
      }
    }

    // PT 신청 데이터 구성
    const applicationData: IPtApplicationData = {
      memberId: session.roleId,
      ptProductId,
      trainerId,
      startDate: parsedStartDate,
      isRegular,
      chosenSchedule,
      totalCount,
      message: message || "",
    };

    // PT 신청 처리
    const newPt = await applyPtService(applicationData);

    return NextResponse.json(
      {
        success: true,
        ptId: newPt.id,
        message: "PT 신청이 완료되었습니다.",
        data: {
          ptId: newPt.id,
          state: newPt.state,
          isRegular: newPt.isRegular,
          ptProduct: newPt.ptProduct,
          trainer: newPt.trainer,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PT 신청 실패:", error);

    if (error instanceof Error) {
      // 비즈니스 로직 에러 처리
      if (
        error.message.includes("찾을 수 없습니다") ||
        error.message.includes("존재하지 않습니다")
      ) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 404 }
        );
      }

      // PT 프로그램 판매 중단 에러
      if (error.message.includes("판매하지 않는")) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 410 }
        ); // Gone
      }

      // 스케줄 충돌 에러
      if (error.message.includes("이미 예약되어 있습니다")) {
        return NextResponse.json(
          {
            error: error.message,
            type: "SCHEDULE_CONFLICT",
          },
          { status: 409 }
        ); // Conflict
      }

      // 검증 에러
      if (
        error.message.includes("선택된 스케줄이 없습니다") ||
        error.message.includes("유효하지 않은")
      ) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 400 }
        );
      }

      // 권한 에러
      if (error.message.includes("권한")) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 403 }
        );
      }

      // 기타 비즈니스 로직 에러
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 422 }
      ); // Unprocessable Entity
    }

    // 예상치 못한 서버 에러
    return NextResponse.json(
      {
        error: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
