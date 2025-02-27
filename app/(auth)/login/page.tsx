"use server";
import Image from "next/image";
import Link from "next/link";
import TestLogin from "./test/testLogin";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const Login = async ({ searchParams }: { searchParams: SearchParams }) => {
  // Welcome page
  const { error } = await searchParams;
  return (
    <main className="w-full flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col w-72">
        <div className="font-extrabold text-[100px] flex flex-col">
          <span>Nobis</span>
          <span className="-mt-16">Gym</span>
        </div>
        <div className="flex flex-col">
          <span>안녕하세요 노비스짐입니다.</span>
          <span>간편하게 소셜계정으로 시작하세요</span>
        </div>
        <div className="flex flex-col gap-5 mt-10">
          <Link href="/login/kakao/start" className="">
            <div className="bg-[#FEE500] h-16 w-full text-[#191500] flex items-center rounded-md pr-5 overflow-hidden pl-2">
              <Image
                src={"/images/logos/kakao_square.png"}
                width={50}
                height={50}
                alt="Kakao logo"
              />
              <div className="flex-1 flex justify-center">
                <span>카카오 로그인</span>
              </div>
            </div>
          </Link>
          <Link href="/login/naver/start" className="">
            <div className="bg-[#01C759] h-16 w-full text-white flex items-center rounded-md pr-5">
              <Image
                src={"/images/logos/naver_square.png"}
                width={64}
                height={64}
                alt="Naver logo"
              />
              <div className="flex-1 flex justify-center">
                <span>네이버 로그인</span>
              </div>
            </div>
          </Link>
          {error && error === "alreadykakao" ? (
            <span className="text-red-500">
              해당 이메일은 카카오 계정과 연동되어 있습니다. 카카오로
              로그인하세요.
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-10 w-72">
        <TestLogin />
      </div>
    </main>
  );
};

export default Login;
