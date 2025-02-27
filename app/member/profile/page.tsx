import { calculateRemainingCount } from "@/app/lib/utils";
import { getProfile } from "./actions";
import Link from "next/link";

const Profile = async () => {
  const memberProfile = await getProfile();
  return (
    <div className="w-full flex flex-col p-2 gap-2">
      <div className="TITLE p-1">
        <span>안녕하세요. {memberProfile.username}님</span>
      </div>
      <div className="BASICINFO border rounded-md shadow-lg p-2">
        <div className="flex flex-col">
          <div className="flex items-center">
            <span>Email : </span>
            <span>{memberProfile.email}</span>
          </div>
        </div>
      </div>
      <div className="MEMBERSHIP  border rounded-md shadow-lg p-2 flex flex-col">
        {memberProfile.memberProfile?.membership &&
        memberProfile.memberProfile.membership.length > 0 &&
        memberProfile.memberProfile.membership[0].startedAt ? (
          <div className="flex flex-col">
            <span>
              {
                memberProfile.memberProfile.membership[0].membershipProduct
                  .title
              }
            </span>
            <span>
              {calculateRemainingCount({
                totalCount:
                  memberProfile.memberProfile.membership[0].membershipProduct
                    .totalCount,
                startedAt: memberProfile.memberProfile.membership[0].startedAt,
              })}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <span>현재 활성화된 회원권이 없습니다.</span>
            <Link href={"/member/profile/membership"}>
              <button className="btn btn-primary">회원권 관리</button>
            </Link>
          </div>
        )}
      </div>
      <div className="PT border rounded-md shadow-lg p-2 flex flex-col">
        {memberProfile.memberProfile?.pt &&
        memberProfile.memberProfile.pt.length > 0 ? (
          <div className="flex flex-col w-full">
            {memberProfile.memberProfile.pt.map((pt) => {
              return (
                <div>
                  <div className="flex flex-col">
                    <span>{pt.ptProduct.title}</span>
                    <span></span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <span>현재 활성화된 PT프로그램이 없습니다.</span>
            <Link href={"/member/profile/pt"}>
              <button className="btn btn-secondary">PT 관리</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
