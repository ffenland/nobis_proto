"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { UserRole } from "@prisma/client";
import { SearchUserByUsernameResult } from "@/app/lib/services/role-management.service";
import useSWR from "swr";

interface RoleChangeProps {
  user: SearchUserByUsernameResult[0];
  onSuccess: () => void;
  onCancel: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RoleChange({ user, onSuccess, onCancel }: RoleChangeProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [selectedCenterId, setSelectedCenterId] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // 피트니스 센터 목록 가져오기
  const { data: centersData } = useSWR("/api/manager/fitness-centers", fetcher);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error("변경할 역할을 선택해주세요.");
      return;
    }

    if ((selectedRole === "TRAINER" || selectedRole === "MANAGER") && !selectedCenterId) {
      toast.error("피트니스 센터를 선택해주세요.");
      return;
    }

    if (selectedRole === user.role) {
      toast.error("현재와 동일한 역할입니다.");
      return;
    }

    // 최종 확인
    const confirmMessage = `정말로 ${user.username}님의 역할을 ${getRoleKorean(selectedRole)}(으)로 변경하시겠습니까?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsChanging(true);
    try {
      const response = await fetch("/api/manager/role-management/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          newRole: selectedRole,
          fitnessCenterId: selectedCenterId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "역할이 변경되었습니다.");
        onSuccess();
      } else {
        toast.error(data.error || "역할 변경에 실패했습니다.");
      }
    } catch (error) {
      toast.error("역할 변경 중 오류가 발생했습니다.");
      console.error(error);
    } finally {
      setIsChanging(false);
    }
  };

  const getRoleKorean = (role: UserRole | string) => {
    switch (role) {
      case "MEMBER":
        return "회원";
      case "TRAINER":
        return "트레이너";
      case "MANAGER":
        return "매니저";
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">역할 변경</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">선택된 사용자</h3>
        <div className="space-y-1">
          <p><span className="text-gray-600">사용자명:</span> {user.username}</p>
          <p><span className="text-gray-600">이메일:</span> {user.email}</p>
          <p><span className="text-gray-600">현재 역할:</span> {getRoleKorean(user.role)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            변경할 역할
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole | "")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isChanging}
          >
            <option value="">선택하세요</option>
            <option value="MEMBER">회원</option>
            <option value="TRAINER">트레이너</option>
            <option value="MANAGER">매니저</option>
          </select>
        </div>

        {(selectedRole === "TRAINER" || selectedRole === "MANAGER") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소속 피트니스 센터
            </label>
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isChanging}
            >
              <option value="">선택하세요</option>
              {centersData?.centers?.map((center: any) => (
                <option key={center.id} value={center.id}>
                  {center.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={isChanging}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isChanging ? "변경 중..." : "역할 변경"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isChanging}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:bg-gray-200"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}