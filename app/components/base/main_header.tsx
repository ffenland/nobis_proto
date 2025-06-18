import { styleClassName } from "@/app/lib/constants";
import { UserRole } from "@prisma/client";
import LogoutButton from "./s_logout_button";

const MainHeader = ({
  username,
  role,
}: {
  username: string;
  role: UserRole;
}) => {
  return (
    <div className={`flex mx-5 justify-between ${styleClassName.cardbox}`}>
      <div className="flex items-center">
        <span>{username}</span>
        <span className="">님 안녕하세요.</span>
      </div>
      <LogoutButton />
    </div>
  );
};

export default MainHeader;
