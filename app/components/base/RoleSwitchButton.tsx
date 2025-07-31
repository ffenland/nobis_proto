"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";

interface RoleSwitchButtonProps {
  targetRole: "TRAINER" | "MANAGER";
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "solid" | "ghost";
}

export default function RoleSwitchButton({ 
  targetRole, 
  size = "sm",
  variant = "outline" 
}: RoleSwitchButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleSwitch = async () => {
    setIsLoading(true);
    
    try {
      const endpoint = targetRole === "TRAINER" 
        ? "/api/manager/switch-role" 
        : "/api/trainer/switch-role";
        
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(data.redirectUrl);
      } else {
        alert(data.error || "역할 전환에 실패했습니다.");
      }
    } catch (error) {
      console.error("Role switch error:", error);
      alert("역할 전환 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = targetRole === "TRAINER" ? "트레이너로 전환" : "매니저로 전환";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRoleSwitch}
      disabled={isLoading}
      className="whitespace-nowrap"
    >
      {isLoading ? "전환 중..." : buttonText}
    </Button>
  );
}