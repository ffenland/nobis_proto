"use client";

import { useRouter } from "next/navigation";

const ErrorPage = () => {
  const router = useRouter();
  // 5초 후 pt pending 페이지로 이동
  setTimeout(() => {
    // router.push("/trainer/pt/pending");
  }, 5000);
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen">
      <h1 className="text-2xl font-bold text-red-500">에러가 발생했습니다.</h1>
      <p className="mt-4 text-gray-600">잠시 후 이전 페이지로 돌아갑니다.</p>
    </div>
  );
};

export default ErrorPage;
