// app/lib/services/pt-delete.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 입력 타입 정의 (I 접두사 사용)
export interface IPtDeleteRequest {
  ptId: string;
  memberId: string;
}

// Member가 PENDING 상태의 PT를 삭제할 수 있는지 확인
export async function canDeletePtService({ ptId, memberId }: IPtDeleteRequest) {
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      memberId: memberId,
    },
    select: {
      id: true,
      state: true,
      ptRecord: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!pt) {
    return false;
  }

  // PENDING 상태이고, 트레이너가 아직 승인하지 않은 경우만 삭제 가능
  return pt.state === PtState.PENDING;
}

// PENDING 상태의 PT 삭제 (연관 데이터도 함께 삭제)
export async function deletePendingPtService({
  ptId,
  memberId,
}: IPtDeleteRequest) {
  // 삭제 가능한지 먼저 확인
  const canDelete = await canDeletePtService({ ptId, memberId });

  if (!canDelete) {
    throw new Error(
      "삭제할 수 없는 PT입니다. PENDING 상태이고 트레이너 승인 전인 PT만 삭제 가능합니다."
    );
  }

  // 트랜잭션으로 안전하게 삭제
  return await prisma.$transaction(async (tx) => {
    // 1. PT와 연결된 weekTime 해제
    await tx.weekTime.updateMany({
      where: { ptId: ptId },
      data: { ptId: null },
    });

    // 2. ptRecord가 있다면 삭제
    await tx.ptRecord.deleteMany({
      where: { ptId: ptId },
    });

    // 3. PT 삭제
    const deletedPt = await tx.pt.delete({
      where: {
        id: ptId,
        memberId: memberId, // 본인 소유 PT만 삭제 가능하도록 추가 보안
      },
      select: {
        id: true,
        state: true,
      },
    });

    return deletedPt;
  });
}
