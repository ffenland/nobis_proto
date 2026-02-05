"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiHome4Fill,
  RiHome4Line,
  RiChatSmile3Fill,
  RiChatSmile3Line,
  RiSettings4Fill,
  RiSettings4Line,
} from "react-icons/ri";
import {
  FaPeopleRobbery,
  FaPeoplePulling,
  FaNewspaper,
  FaRegNewspaper,
} from "react-icons/fa6";

export const MasterTabbar = () => {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid w-full grid-cols-5 border-t border-neutral-500 bg-base-100 py-3">
      <Link href={"/master"} className="flex flex-col items-center gap-px">
        {pathname === "/master" ? <RiHome4Fill /> : <RiHome4Line />}
        <span>홈</span>
      </Link>
      <Link
        href={"/master/dashboard"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/master/dashboard" ? (
          <FaNewspaper />
        ) : (
          <FaRegNewspaper />
        )}
        <span>운영관리</span>
      </Link>
      <Link
        href={"/master/product"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/master/product" ? (
          <RiChatSmile3Fill />
        ) : (
          <RiChatSmile3Line />
        )}
        <span>업무관리</span>
      </Link>
      <Link
        href={"/master/trainers"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/master/trainers" ? (
          <FaPeopleRobbery />
        ) : (
          <FaPeoplePulling />
        )}
        <span>트레이너</span>
      </Link>
      <Link
        href={"/master/settings"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/master/settings" ? (
          <RiSettings4Fill />
        ) : (
          <RiSettings4Line />
        )}
        <span>설정</span>
      </Link>
    </div>
  );
};

export default MasterTabbar;
