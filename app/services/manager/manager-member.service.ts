import prisma from "@/app/lib/prisma";

export async function getAllMembers() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      active: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          avatarImageId: true,
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
          address: true,
          phone: true,
        },
      },
      // PT
      pt: {
        select: {
          id: true,
          state: true,
          startDate: true,
          lessons: {
            select: {
              id: true,
              scheduledAt: true,
              endAt: true,
              isCanceled: true,
              records: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: {
              scheduledAt: "desc",
            },
            take: 5, //
          },
        },
      },
      //
      membership: {
        select: {
          id: true,
          startedAt: true,
          closedAt: true,
          isActive: true,
          totalDays: true,
          paid: true,
          membershipProduct: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1, //
      },
    },
    orderBy: [{ active: "desc" }, { user: { username: "asc" } }],
  });

  return members.map((member) => {
    //
    const allLessons = member.pt
      .flatMap((pt) => pt.lessons)
      .sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );

    const recentLesson = allLessons[0];

    // \1 d�� �
    const activeMembership = member.membership[0];

    return {
      id: member.id,
      username: member.user.username,
      email: member.user.email,
      mobile: member.user.mobile,
      avatarImageId: member.user.avatarImageId,
      active: member.active,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      fitnessCenter: member.fitnessCenter
        ? {
            id: member.fitnessCenter.id,
            title: member.fitnessCenter.title,
            address: member.fitnessCenter.address,
            phone: member.fitnessCenter.phone,
          }
        : null,
      // PT
      stats: {
        totalPt: member.pt.length,
        activePt: member.pt.filter((pt) => pt.state === "CONFIRMED").length,
        pendingPt: member.pt.filter((pt) => pt.state === "PENDING").length,
        finishedPt: member.pt.filter((pt) => pt.state === "FINISHED").length,
        rejectedPt: member.pt.filter((pt) => pt.state === "REJECTED").length,
      },
      recentLesson: recentLesson
        ? {
            id: recentLesson.id,
            scheduledAt: recentLesson.scheduledAt,
            endAt: recentLesson.endAt,
            isCanceled: recentLesson.isCanceled,
            hasRecords: recentLesson.records.length > 0,
          }
        : null,
      membership: activeMembership
        ? {
            id: activeMembership.id,
            startedAt: activeMembership.startedAt,
            closedAt: activeMembership.closedAt,
            isActive: activeMembership.isActive,
            totalDays: activeMembership.totalDays,
            paid: activeMembership.paid,
            product: {
              id: activeMembership.membershipProduct.id,
              title: activeMembership.membershipProduct.title,
              price: activeMembership.membershipProduct.price,
            },
          }
        : null,
    };
  });
}

//
export type GetAllMembersResult = Awaited<ReturnType<typeof getAllMembers>>;
export type MemberListItem = GetAllMembersResult[0];
