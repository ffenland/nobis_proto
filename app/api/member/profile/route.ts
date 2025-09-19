import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import {
  getMemberProfile,
  updateMemberProfile,
  UpdateMemberProfileInput,
} from "@/app/services/member/profile.service";

export const GET = async () => {
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const profile = await getMemberProfile(session.id);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching member profile:", error);
    return NextResponse.json(
      { error: "프로필 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
};

export const PUT = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const data: UpdateMemberProfileInput = await request.json();

    const updatedProfile = await updateMemberProfile(session.id, data);
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating member profile:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
