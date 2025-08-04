"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthStep from "./components/AuthStep";
import UserSearch from "./components/UserSearch";
import RoleChange from "./components/RoleChange";
import { SearchUserByUsernameResult } from "@/app/lib/services/role-management.service";

export default function RoleManagementPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<"auth" | "search" | "change">("auth");
  const [selectedUser, setSelectedUser] = useState<SearchUserByUsernameResult[0] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 세션에서 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      
      if (data.roleManagementAuth && data.roleManagementAuthTime) {
        // 30분 이내인지 확인
        const authTime = new Date(data.roleManagementAuthTime).getTime();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (now - authTime < thirtyMinutes) {
          setIsAuthenticated(true);
          setCurrentStep("search");
        }
      }
    } catch (error) {
      console.error("Auth status check failed:", error);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setCurrentStep("search");
  };

  const handleSelectUser = (user: SearchUserByUsernameResult[0]) => {
    setSelectedUser(user);
    setCurrentStep("change");
  };

  const handleRoleChangeSuccess = () => {
    setSelectedUser(null);
    setCurrentStep("search");
  };

  const handleCancel = () => {
    setSelectedUser(null);
    setCurrentStep("search");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">사용자 역할 관리</h1>

        {/* 단계 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <Step number={1} label="인증" active={currentStep === "auth"} completed={isAuthenticated} />
            <div className="h-px bg-gray-300 w-16"></div>
            <Step number={2} label="사용자 검색" active={currentStep === "search"} completed={!!selectedUser} />
            <div className="h-px bg-gray-300 w-16"></div>
            <Step number={3} label="역할 변경" active={currentStep === "change"} completed={false} />
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="min-h-[400px]">
          {currentStep === "auth" && !isAuthenticated && (
            <AuthStep onSuccess={handleAuthSuccess} />
          )}
          
          {currentStep === "search" && isAuthenticated && (
            <UserSearch onSelectUser={handleSelectUser} />
          )}
          
          {currentStep === "change" && selectedUser && (
            <RoleChange
              user={selectedUser}
              onSuccess={handleRoleChangeSuccess}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function Step({ number, label, active, completed }: StepProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
          ${active ? "bg-blue-600" : completed ? "bg-green-600" : "bg-gray-400"}
        `}
      >
        {completed ? "✓" : number}
      </div>
      <span className={`mt-2 text-sm ${active ? "text-blue-600 font-medium" : "text-gray-600"}`}>
        {label}
      </span>
    </div>
  );
}