"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaNewspaper,
  FaPeoplePulling,
  FaPeopleRobbery,
  FaRegNewspaper,
} from "react-icons/fa6";
import {
  RiChatSmile3Fill,
  RiChatSmile3Line,
  RiHome4Fill,
  RiHome4Line,
  RiSettings4Fill,
  RiSettings4Line,
} from "react-icons/ri";

const ManagerTabbar = () => {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid w-full grid-cols-5 border-t border-neutral-500 bg-base-100 py-3">
      <Link href={"/manager"} className="flex flex-col items-center gap-px">
        {pathname === "/manager" ? <RiHome4Fill /> : <RiHome4Line />}
        <span>홈</span>
      </Link>
      <Link
        href={"/manager/product"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/member/product" ? (
          <RiChatSmile3Fill />
        ) : (
          <RiChatSmile3Line />
        )}
        <span>상품관리</span>
      </Link>
      <Link
        href={"/manager/trainers"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/manager/trainers" ? (
          <FaPeopleRobbery />
        ) : (
          <FaPeoplePulling />
        )}
        <span>트레이너</span>
      </Link>
      <Link
        href={"/manager/members"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/manager/members" ? <FaNewspaper /> : <FaRegNewspaper />}
        <span>회원관리</span>
      </Link>
      <Link
        href={"/manager/centers"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/manager/centers" ? (
          <RiSettings4Fill />
        ) : (
          <RiSettings4Line />
        )}
        <span>매장관리</span>
      </Link>
    </div>
  );
};

export default ManagerTabbar;
