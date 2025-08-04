import Image from "next/image";
import Link from "next/link";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const Login = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { error } = await searchParams;

  const errorMessages: { [key: string]: string } = {
    alreadykakao:
      "해당 이메일은 카카오 계정과 연동되어 있습니다. 카카오로 로그인하세요.",
    alreadynaver:
      "해당 이메일은 네이버 계정과 연동되어 있습니다. 네이버로 로그인하세요.",
    failkakao: "카카오 로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
    failnaver: "네이버 로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
    failkakaotoken: "카카오 인증에 실패했습니다. 다시 시도해주세요.",
    failnavertoken: "네이버 인증에 실패했습니다. 다시 시도해주세요.",
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 로고 및 브랜딩 */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="mb-6">
            <Image
              src="/images/logos/nobis_logo_a.png"
              width={120}
              height={120}
              alt="Nobis Gym Logo"
              className="mx-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Nobis Gym</h1>
          <p className="text-gray-600">당신의 건강한 일상을 위한 파트너</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            환영합니다!
          </h2>
          <p className="text-gray-600 mb-8">
            간편하게 소셜 계정으로 시작하세요
          </p>

          {/* 소셜 로그인 버튼들 */}
          <div className="space-y-4">
            <Link href="/login/kakao/start" className="block">
              <div className="bg-[#FEE500] hover:bg-[#FDD400] transition-all duration-200 h-14 w-full text-[#191500] flex items-center rounded-xl pr-4 overflow-hidden shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <div className="w-14 h-14 flex items-center justify-center">
                  <Image
                    src="/images/logos/kakao_square.png"
                    width={40}
                    height={40}
                    alt="Kakao logo"
                  />
                </div>
                <div className="flex-1 text-center">
                  <span className="font-medium text-base">카카오 로그인</span>
                </div>
              </div>
            </Link>

            <Link href="/login/naver/start" className="block">
              <div className="bg-[#03C75A] hover:bg-[#02B351] transition-all duration-200 h-14 w-full text-white flex items-center rounded-xl pr-4 overflow-hidden shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <div className="w-14 h-14 flex items-center justify-center">
                  <Image
                    src="/images/logos/naver_square.png"
                    width={50}
                    height={50}
                    alt="Naver logo"
                  />
                </div>
                <div className="flex-1 text-center">
                  <span className="font-medium text-base">네이버 로그인</span>
                </div>
              </div>
            </Link>
          </div>

          {/* 에러 메시지 */}
          {error && errorMessages[error as string] && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
              <p className="text-sm text-red-600 text-center">
                {errorMessages[error as string]}
              </p>
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="mt-8 text-center text-sm text-gray-500 animate-fadeIn">
          <p>로그인 시 서비스 이용약관과 개인정보처리방침에</p>
          <p>동의하는 것으로 간주됩니다.</p>
        </div>
      </div>
    </main>
  );
};

export default Login;
