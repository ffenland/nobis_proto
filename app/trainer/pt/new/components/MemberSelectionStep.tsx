"use client";

import { useState } from "react";
import { Search, User, Calendar, Clock } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import useSWR from "swr";
import type {
  GetMembersForPtCreationResult,
  GetMemberDetailsForPtCreationResult
} from "@/app/services/trainer/pt.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MemberSelectionStepProps {
  onNext: (selectedMember: { id: string; name: string; email: string }) => void;
}

const MemberSelectionStep = ({ onNext }: MemberSelectionStepProps) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [actualSearchQuery, setActualSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 기본 회원 목록 (최근 10명)
  const {
    data: defaultMembers,
    error: defaultError,
    isLoading: defaultLoading,
  } = useSWR<GetMembersForPtCreationResult>("/api/trainer/pt/members?limit=10", fetcher);


  // 검색 결과
  const {
    data: searchMembers,
    error: searchError,
    isLoading: searchLoading,
  } = useSWR<GetMembersForPtCreationResult>(
    actualSearchQuery
      ? `/api/trainer/pt/members?search=${encodeURIComponent(actualSearchQuery)}`
      : null,
    fetcher
  );

  // 선택된 회원 상세 정보
  const {
    data: memberDetails,
    error: memberDetailsError,
    isLoading: memberDetailsLoading,
  } = useSWR<GetMemberDetailsForPtCreationResult>(
    selectedMemberId ? `/api/trainer/pt/members/${selectedMemberId}` : null,
    fetcher
  );

  const members = actualSearchQuery ? searchMembers : defaultMembers;
  const isLoading = actualSearchQuery ? searchLoading : defaultLoading;
  const error = actualSearchQuery ? searchError : defaultError;

  const handleSearch = () => {
    if (inputValue.trim()) {
      setIsSearching(true);
      setActualSearchQuery(inputValue.trim());
      // SWR이 자동으로 데이터를 가져옴
      setTimeout(() => setIsSearching(false), 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleNext = () => {
    if (!selectedMemberId || !members) {
      alert("회원을 선택해주세요.");
      return;
    }

    const selectedMember = members.find((m) => m.id === selectedMemberId);
    if (!selectedMember) {
      alert("선택된 회원 정보를 찾을 수 없습니다.");
      return;
    }

    onNext({
      id: selectedMember.id,
      name: selectedMember.user.username,
      email: selectedMember.user.email,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-gray-600">회원 목록을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 text-sm">
              회원 목록을 불러올 수 없습니다. 다시 시도해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                PT를 받을 회원을 선택해주세요
              </h3>
            </div>

            {/* 검색 박스 */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="회원 이름으로 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!inputValue.trim() || isSearching}
                variant="outline"
              >
                {isSearching ? "검색 중..." : "검색"}
              </Button>
            </div>

            {/* 안내 텍스트 */}
            <p className="text-sm text-gray-600">
              {actualSearchQuery
                ? `"${actualSearchQuery}"에 대한 검색 결과`
                : "최근 등록된 회원 10명이 표시됩니다. 다른 회원을 찾으시려면 검색을 이용해주세요."}
            </p>

            {/* 회원 목록 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members && members.length > 0 ? (
                members.map((member) => (
                  <div
                    key={member.id}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${
                        selectedMemberId === member.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          실명: {member.user.realname || "실명 미입력"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {member.user.email}
                        </p>
                        {member.user.mobile && (
                          <p className="text-sm text-gray-500">
                            {member.user.mobile}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          checked={selectedMemberId === member.id}
                          onChange={() => setSelectedMemberId(member.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {actualSearchQuery
                      ? "검색 결과가 없습니다."
                      : "등록된 회원이 없습니다."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 회원 상세 정보 */}
      {selectedMemberId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                선택된 회원 정보
              </h3>
            </div>

            {memberDetailsLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-gray-600">회원 정보를 불러오는 중...</span>
              </div>
            )}

            {memberDetailsError && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-red-600 text-sm">
                  회원 상세 정보를 불러올 수 없습니다.
                </p>
              </div>
            )}

            {memberDetails && (
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">기본 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">이름:</span>{" "}
                      <span className="font-medium">{memberDetails.user.username}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">실명:</span>{" "}
                      <span className="font-medium">{memberDetails.user.realname || "실명 미입력"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">이메일:</span>{" "}
                      <span>{memberDetails.user.email}</span>
                    </div>
                    {memberDetails.user.mobile && (
                      <div>
                        <span className="text-gray-600">연락처:</span>{" "}
                        <span>{memberDetails.user.mobile}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">가입일:</span>{" "}
                      <span>{new Date(memberDetails.user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* PT 이력 (최근 6개월) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium text-gray-900">PT 이력 (최근 6개월)</h4>
                  </div>

                  {memberDetails.confirmedPts.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-green-700 mb-2">
                        현재 수업중인 PT
                      </h5>
                      <div className="space-y-2">
                        {memberDetails.confirmedPts.map((pt) => (
                          <div key={pt.id} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-green-800">
                                  {pt.ptProduct.title}
                                </p>
                                <p className="text-sm text-green-600">
                                  트레이너: {pt.trainer?.user.username || "정보 없음"}
                                </p>
                                <p className="text-sm text-green-600">
                                  첫 수업일: {new Date(pt.startDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-green-600">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-medium">진행중</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 기타 PT 상태별 카운트 */}
                  {(memberDetails.stateCounts.PENDING > 0 ||
                    memberDetails.stateCounts.ACCEPTING > 0 ||
                    memberDetails.stateCounts.REJECTED > 0 ||
                    memberDetails.stateCounts.FINISHED > 0) && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        기타 PT 현황
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {memberDetails.stateCounts.PENDING > 0 && (
                          <div className="bg-yellow-50 p-2 rounded text-center">
                            <div className="text-yellow-800 font-medium">
                              {memberDetails.stateCounts.PENDING}건
                            </div>
                            <div className="text-yellow-600 text-xs">신청중</div>
                          </div>
                        )}
                        {memberDetails.stateCounts.ACCEPTING > 0 && (
                          <div className="bg-blue-50 p-2 rounded text-center">
                            <div className="text-blue-800 font-medium">
                              {memberDetails.stateCounts.ACCEPTING}건
                            </div>
                            <div className="text-blue-600 text-xs">접수중</div>
                          </div>
                        )}
                        {memberDetails.stateCounts.REJECTED > 0 && (
                          <div className="bg-red-50 p-2 rounded text-center">
                            <div className="text-red-800 font-medium">
                              {memberDetails.stateCounts.REJECTED}건
                            </div>
                            <div className="text-red-600 text-xs">취소</div>
                          </div>
                        )}
                        {memberDetails.stateCounts.FINISHED > 0 && (
                          <div className="bg-gray-50 p-2 rounded text-center">
                            <div className="text-gray-800 font-medium">
                              {memberDetails.stateCounts.FINISHED}건
                            </div>
                            <div className="text-gray-600 text-xs">완료</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {memberDetails.confirmedPts.length === 0 &&
                   Object.values(memberDetails.stateCounts).every(count => count === 0) && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        최근 6개월 내 PT 이력이 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 다음 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!selectedMemberId}
          className="min-w-[120px]"
        >
          다음 단계
        </Button>
      </div>
    </div>
  );
};

export default MemberSelectionStep;
