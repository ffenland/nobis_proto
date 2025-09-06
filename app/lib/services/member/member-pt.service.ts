// app/lib/services/member/member-pt.service.ts
import prisma from "@/app/lib/prisma";

// PT 메시지(description) 업데이트
export async function updatePtDescription(
  ptId: string,
  memberId: string,
  description: string
): Promise<{ message: string }> {
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      memberId,
    },
    select: {
      id: true,
    },
  });

  if (!pt) {
    throw new Error("PT를 찾을 수 없거나 권한이 없습니다.");
  }

  await prisma.pt.update({
    where: {
      id: ptId,
    },
    data: {
      description: description || "",
    },
  });

  return {
    message: "PT 메시지가 성공적으로 업데이트되었습니다.",
  };
}

// 타입 추론
export type UpdatePtDescriptionResult = Awaited<
  ReturnType<typeof updatePtDescription>
>;