"use client";

import { useState } from "react";
import SignUp from "./SignUp";
import PasswordLogin from "./PasswordLogin";

export default function LoginClient() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <>
      {/* 비밀번호 로그인 */}
      <PasswordLogin />

      {/* 회원가입 버튼 */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setShowSignUp(true)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          아직 계정이 없으신가요? 회원가입
        </button>
      </div>

      {/* 회원가입 모달 */}
      {showSignUp && <SignUp onClose={() => setShowSignUp(false)} />}
    </>
  );
}