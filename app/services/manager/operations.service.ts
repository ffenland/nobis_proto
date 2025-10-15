import prisma from "@/app/lib/prisma";

// 미수금 내역 조회 (PENDING 상태의 PtPayment)
export async function getUnpaidPtPayments(managerId: string) {
  try {
    const now = new Date();

    // PENDING 상태인 PtPayment 조회
    const unpaidPayments = await prisma.ptPayment.findMany({
      where: {
        state: "PENDING",
        pt: {
          trainer: {
            fitnessCenter: {
              managers: {
                some: {
                  id: managerId, // 매니저가 관리하는 센터의 PT만
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        pt: {
          select: {
            id: true,
            startDate: true,
            trainer: {
              select: {
                id: true,
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
                fitnessCenter: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            member: {
              select: {
                id: true,
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 긴급도 계산 및 정렬
    const paymentsWithUrgency = unpaidPayments.map((payment) => {
      const isUrgent = new Date(payment.pt.startDate) < now;

      return {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        createdAt: payment.createdAt,
        ptId: payment.pt.id,
        startDate: payment.pt.startDate,
        isUrgent, // 수업 시작일이 과거인 경우 긴급
        trainerName:
          payment.pt.trainer?.user.realname ||
          payment.pt.trainer?.user.username ||
          "알 수 없음",
        trainerId: payment.pt.trainer?.id,
        memberName:
          payment.pt.member?.user.realname ||
          payment.pt.member?.user.username ||
          "알 수 없음",
        memberId: payment.pt.member?.id,
        fitnessCenterId: payment.pt.trainer?.fitnessCenter?.id,
        fitnessCenterTitle: payment.pt.trainer?.fitnessCenter?.title,
      };
    });

    // 긴급한 건 먼저, 그 다음 수업 시작일 오름차순
    paymentsWithUrgency.sort((a, b) => {
      if (a.isUrgent !== b.isUrgent) {
        return a.isUrgent ? -1 : 1; // 긴급한 건 먼저
      }
      return (
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    });

    return {
      payments: paymentsWithUrgency,
      totalCount: paymentsWithUrgency.length,
      urgentCount: paymentsWithUrgency.filter((p) => p.isUrgent).length,
    };
  } catch (error) {
    console.error("Get unpaid PT payments error:", error);
    throw error;
  }
}

// 타입 추론
export type GetUnpaidPtPaymentsResult = Awaited<
  ReturnType<typeof getUnpaidPtPayments>
>;
