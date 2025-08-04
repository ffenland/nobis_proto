import { notFound } from "next/navigation";
import TestLogin from "../login/test/testLogin";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const SecretTestLogin = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { key } = await searchParams;

  // 환경변수와 키 비교
  if (!key || key !== process.env.TEST_LOGIN_KEY) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 max-w-sm mx-auto">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              테스트 로그인
            </h1>
            <p className="text-gray-600">
              개발 및 테스트용 로그인 페이지입니다.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <TestLogin />
          </div>
        </div>
      </div>
    </main>
  );
};

export default SecretTestLogin;
