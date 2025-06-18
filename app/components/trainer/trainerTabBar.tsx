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

const TrainerTabBar = () => {
  const pathname = usePathname();
  return (
    <div className="w-full mx-auto grid grid-cols-5 border-neutral-500 border-t py-3 bg-base-100">
      <Link href={"/trainer"} className="flex flex-col items-center gap-px">
        {pathname === "/trainer" ? <RiHome4Fill /> : <RiHome4Line />}
        <span>홈</span>
      </Link>
      <Link
        href={"/trainer/chat"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/trainer/chat  " ? (
          <RiChatSmile3Fill />
        ) : (
          <RiChatSmile3Line />
        )}
        <span>채팅</span>
      </Link>
      <Link href={"/trainer/pt"} className="flex flex-col items-center gap-px">
        {pathname === "/trainer/pt" ? <FaPeopleRobbery /> : <FaPeoplePulling />}
        <span>PT</span>
      </Link>
      <Link
        href={"/trainer/schedule"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/trainer/schedule" ? (
          <FaNewspaper />
        ) : (
          <FaRegNewspaper />
        )}
        <span>스케줄</span>
      </Link>
      <Link
        href={"/trainer/profile"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/trainer/profile" ? (
          <RiSettings4Fill />
        ) : (
          <RiSettings4Line />
        )}
        <span>프로필</span>
      </Link>
    </div>
  );
};

export default TrainerTabBar;
