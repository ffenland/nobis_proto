"use server";

import { getSession } from "@/app/lib/session";
import { getPtRecordDetailForMemberService } from "@/app/lib/services/pt-record-detail.service";
import { Prisma } from "@prisma/client";

// PT 기록 상세 조회 액션
export const getPtRecordDetailAction = async (ptRecordId: string) => {
  const session = await getSession();
  if (!session || session.role !== "MEMBER") {
    throw new Error("로그인이 필요합니다.");
  }

  try {
    const ptRecordDetail = await getPtRecordDetailForMemberService(
      ptRecordId,
      session.roleId  // roleId가 memberId입니다
    );
    
    return ptRecordDetail;
  } catch (error) {
    console.error("PT 기록 상세 조회 실패:", error);
    throw error;
  }
};

// 타입 추론
export type TPtRecordDetail = Prisma.PromiseReturnType<
  typeof getPtRecordDetailAction
>;