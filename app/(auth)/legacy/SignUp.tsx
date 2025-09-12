"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";

interface SignUpProps {
  onClose: () => void;
}

export default function SignUp({ onClose }: SignUpProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile: "",
    role: ""
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("회원가입이 완료되었습니다!");
        onClose();
        
        // SWR 캐시 갱신 - GlobalHeader가 즉시 표시되도록
        await mutate("/api/auth/session");
        
        // 역할에 따라 리다이렉트
        if (data.role === "MEMBER") {
          router.push("/member");
        } else if (data.role === "TRAINER") {
          router.push("/trainer");
        }
      } else {
        alert(data.error || "회원가입에 실패했습니다");
      }
    } catch (error) {
      alert("회원가입 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">회원가입</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                사용자명
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="사용자명을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                이메일
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-sm font-medium mb-1">
                휴대폰 번호
              </label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                required
                value={formData.mobile}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="01012345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                역할을 선택하세요
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="MEMBER"
                    required
                    checked={formData.role === "MEMBER"}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span>회원</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="TRAINER"
                    required
                    checked={formData.role === "TRAINER"}
                    onChange={handleChange}
                    className="radio radio-primary mr-2"
                  />
                  <span>트레이너</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary flex-1"
            >
              {isLoading ? "처리 중..." : "회원가입"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}