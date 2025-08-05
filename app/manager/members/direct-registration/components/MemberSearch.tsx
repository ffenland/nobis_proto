"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import useSWR from "swr";
import type { SearchMembersResult } from "@/app/lib/services/manager/direct-registration.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MemberSearchProps {
  onSelect: (member: SearchMembersResult[0]) => void;
}

export default function MemberSearch({ onSelect }: MemberSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingMember, setCheckingMember] = useState<string | null>(null);

  const { data: members, isLoading } = useSWR<SearchMembersResult>(
    searchQuery ? `/api/manager/direct-registration/members/search?q=${encodeURIComponent(searchQuery)}` : null,
    fetcher
  );

  const handleMemberClick = useCallback(async (member: SearchMembersResult[0]) => {
    if (member.activePtCount > 0) {
      alert(`${member.user.username}님은 이미 ${member.activePtCount}개의 활성 PT를 보유하고 있습니다.`);
      return;
    }

    setCheckingMember(member.id);
    
    try {
      const response = await fetch(`/api/manager/direct-registration/members/${member.id}/check`);
      const data = await response.json();
      
      if (data.eligible) {
        onSelect(member);
      } else {
        alert(`${member.user.username}님은 현재 등록할 수 없습니다.`);
      }
    } catch (error) {
      alert("회원 확인 중 오류가 발생했습니다.");
    } finally {
      setCheckingMember(null);
    }
  }, [onSelect]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">회원 검색</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="회원 이름으로 검색..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>• 기존 수업을 등록할 회원을 검색하세요.</p>
          <p>• 이미 활성 PT가 있는 회원은 선택할 수 없습니다.</p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <p className="text-gray-600">검색 중...</p>
        </div>
      )}

      {members && members.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">검색 결과</h3>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-colors
                  ${member.activePtCount > 0 
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed" 
                    : "border-gray-300 hover:bg-gray-50 hover:border-blue-400"
                  }
                `}
                onClick={() => handleMemberClick(member)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.user.username}</span>
                      {member.activePtCount > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          활성 PT {member.activePtCount}개
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{member.user.email}</p>
                  </div>
                  {checkingMember === member.id ? (
                    <span className="text-sm text-gray-500">확인 중...</span>
                  ) : (
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      선택
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members && members.length === 0 && searchQuery && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}