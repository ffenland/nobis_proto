"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";

export default function PasswordLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // SWR 캐시 갱신 - GlobalHeader가 즉시 표시되도록
        await mutate("/api/auth/session");
        
        // 역할에 따라 리다이렉트
        if (data.role === "MEMBER") {
          router.push("/member");
        } else if (data.role === "TRAINER") {
          router.push("/trainer");
        } else if (data.role === "MANAGER") {
          router.push("/manager");
        }
      } else {
        alert(data.error || "로그인에 실패했습니다");
      }
    } catch (error) {
      alert("로그인 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="divider">또는</div>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input input-bordered w-full"
              placeholder="사용자명"
            />
          </div>
          
          <div>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full"
              placeholder="비밀번호"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-neutral w-full"
          >
            {isLoading ? "처리 중..." : "비밀번호로 로그인"}
          </button>
        </div>
      </form>
    </div>
  );
}