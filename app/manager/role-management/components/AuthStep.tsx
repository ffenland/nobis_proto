"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";

interface AuthStepProps {
  onSuccess: () => void;
}

export default function AuthStep({ onSuccess }: AuthStepProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/manager/role-management/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("인증되었습니다.");
        onSuccess();
      } else {
        toast.error(data.error || "인증에 실패했습니다.");
        setPassword("");
      }
    } catch (error) {
      toast.error("인증 중 오류가 발생했습니다.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">관리자 인증</h2>
        <p className="text-gray-600 mb-6">
          역할 관리 기능을 사용하려면 관리자 비밀번호를 입력해주세요.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="비밀번호 입력"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? "인증 중..." : "인증하기"}
          </button>
        </form>
      </div>
    </div>
  );
}