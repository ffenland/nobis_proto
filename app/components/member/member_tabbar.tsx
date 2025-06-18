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

const MemberTabBar = () => {
  const pathname = usePathname();
  return (
    <div className="w-full mx-auto grid grid-cols-5 border-neutral-500 border-t py-3 bg-base-100">
      <Link href={"/member"} className="flex flex-col items-center gap-px">
        {pathname === "/member" ? <RiHome4Fill /> : <RiHome4Line />}
        <span>홈</span>
      </Link>
      <Link href={"/member/chat"} className="flex flex-col items-center gap-px">
        {pathname === "/member/chat" ? (
          <RiChatSmile3Fill />
        ) : (
          <RiChatSmile3Line />
        )}
        <span>채팅</span>
      </Link>
      <Link href={"/member/pt"} className="flex flex-col items-center gap-px">
        {pathname === "/member/schedule" ? (
          <FaPeopleRobbery />
        ) : (
          <FaPeoplePulling />
        )}
        <span>PT</span>
      </Link>
      <Link href={"/member/post"} className="flex flex-col items-center gap-px">
        {pathname === "/member/post" ? <FaNewspaper /> : <FaRegNewspaper />}
        <span>게시판</span>
      </Link>
      <Link
        href={"/member/profile"}
        className="flex flex-col items-center gap-px"
      >
        {pathname === "/member/profile" ? (
          <RiSettings4Fill />
        ) : (
          <RiSettings4Line />
        )}
        <span>프로필</span>
      </Link>
    </div>
  );
};

export default MemberTabBar;
