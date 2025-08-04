"use client";

import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { SearchUserByUsernameResult } from "@/app/lib/services/role-management.service";
import { UserRole } from "@prisma/client";

interface UserSearchProps {
  onSelectUser: (user: SearchUserByUsernameResult[0]) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserByUsernameResult>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/manager/role-management/search?username=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.users || []);
        if (data.users.length === 0) {
          toast("검색 결과가 없습니다.");
        }
      } else {
        toast.error(data.error || "검색 중 오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("검색 중 오류가 발생했습니다.");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "MEMBER":
        return "bg-green-100 text-green-800";
      case "TRAINER":
        return "bg-blue-100 text-blue-800";
      case "MANAGER":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleKorean = (role: UserRole) => {
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">사용자 검색</h2>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="사용자명 검색 (빈 칸으로 검색 시 전체 조회)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isSearching ? "검색 중..." : "검색"}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">검색 결과</h3>
          <div className="space-y-3">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectUser(user)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleKorean(user.role)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      가입일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    선택
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}