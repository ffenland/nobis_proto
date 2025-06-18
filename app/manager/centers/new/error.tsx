"use client";

import { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Error = ({ error }: { error: Error & { digest?: string } }) => {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState<string>("");
  useEffect(() => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // 유니크 제약 조건 위반 에러 (P2002)
      if (error.code === "P2002") {
        setErrorMessage("중복된 이름이 있습니다. 다른 이름을 사용해 주세요.");
      } else {
        setErrorMessage(
          "데이터베이스 에러가 발생했습니다. 잠시 후 다시 시도해 주세요."
        );
      }
    } else {
      setErrorMessage(
        "알 수 없는 문제가 발생했습니다! 계속 반복되면 관리자에게 문의하세요"
      );
    }
  }, [error]);

  return (
    <main className="flex h-full flex-col items-center justify-center">
      <h2 className="text-center">문제가 발생했습니다!</h2>
      <span></span>
      <button
        className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-sm text-white"
        onClick={() => router.back()}
      >
        이전 페이지로 돌아가기
      </button>
    </main>
  );
};

export default Error;
