import { calculateRemainingCount } from "@/app/lib/utils";
import { getProfile, IMemberProfile } from "./actions";
import Link from "next/link";
import Image from "next/image";

const Profile = async () => {
  const memberProfile: IMemberProfile = await getProfile();
  const { username, email, avatar, memberProfile: member } = memberProfile;
  const membership = member?.membership?.[0];
  const ptList = member?.pt ?? [];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6 p-4">
      {/* 프로필 카드 */}
      <div className="flex items-center gap-4 bg-white rounded-xl shadow p-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
          {avatar ? (
            <Image
              src={avatar}
              alt="avatar"
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            username?.[0] ?? "U"
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold">{username} 님</span>
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </div>

      {/* PT 카드 */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
        <div className="font-semibold text-blue-700 mb-1">PT 프로그램</div>
        {ptList.length > 0 ? (
          <div className="flex flex-col gap-2">
            {ptList.map((pt) => (
              <div
                key={pt.id}
                className="border-b last:border-b-0 pb-2 last:pb-0"
              >
                <div className="font-medium">{pt.ptProduct.title}</div>
                <div className="text-sm text-gray-500">
                  {pt.isActive ? "진행중" : "승인대기"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-gray-400">
              현재 활성화된 PT 프로그램이 없습니다.
            </span>
            <Link href={"/member/profile/pt"}>
              <button className="btn btn-secondary btn-sm">PT 관리</button>
            </Link>
          </div>
        )}
      </div>
      {/* 회원권 카드 */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
        <div className="font-semibold text-green-700 mb-1">회원권</div>
        {membership && membership.startedAt ? (
          <div>
            <div className="font-medium">
              {membership.membershipProduct.title}
            </div>
            <div className="text-sm text-gray-500">
              남은 횟수:{" "}
              {calculateRemainingCount({
                totalCount: membership.membershipProduct.totalCount,
                startedAt: membership.startedAt,
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-gray-400">
              현재 활성화된 회원권이 없습니다.
            </span>
            <Link href={"/member/profile/membership"}>
              <button className="btn btn-primary btn-sm">회원권 관리</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
