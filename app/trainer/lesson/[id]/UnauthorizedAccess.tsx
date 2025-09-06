"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

const UnauthorizedAccess = () => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // setTimeout을 사용하여 렌더링 사이클 이후에 실행
          setTimeout(() => {
            router.push("/trainer/pt");
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleRedirectNow = () => {
    router.push("/trainer/pt");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h2>
          
          <p className="text-gray-600 mb-6">
            요청하신 수업은 귀하의 수업이 아닙니다.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-lg text-indigo-600">{countdown}</span>초 후 
              PT 목록 페이지로 이동합니다
            </p>
          </div>
          
          <button
            onClick={handleRedirectNow}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-indigo-700 transition-colors duration-200"
          >
            바로 이동하기
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            계속해서 이 문제가 발생한다면 관리자에게 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedAccess;