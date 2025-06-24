"use client";

import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getOrCreateChatRoom } from "@/app/lib/s_chat";
export const ChatToUserButton = ({
  userIdA,
  userIdB,
  role,
  title,
}: {
  userIdA: string;
  userIdB: string;
  role: UserRole;
  title: string;
}) => {
  const router = useRouter();

  const handleChat = async () => {
    const result = await getOrCreateChatRoom(userIdA, userIdB);
    if (!result.ok || !result.data) {
      router.push(
        `/${
          role === UserRole.MEMBER
            ? "member"
            : role === UserRole.TRAINER
            ? "trainer"
            : "manager"
        }/chat`
      );
    }
    router.push(
      `/${
        role === UserRole.MEMBER
          ? "member"
          : role === UserRole.TRAINER
          ? "trainer"
          : "manager"
      }/chat/${result.data!.roomId}`
    );
  };

  return (
    <button className="btn btn-primary" onClick={handleChat}>
      {title}
    </button>
  );
};
