"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Check,
  Shield,
} from "lucide-react";
import {
  SearchUsersForManagerResult,
  SearchUserItem,
} from "@/app/services/master/master-trainer.service";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const convertMutator = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "변환에 실패했습니다.");
  }
  return response.json();
};

const roleLabels: Record<string, string> = {
  MEMBER: "회원",
  TRAINER: "트레이너",
};

const roleColors: Record<string, string> = {
  MEMBER: "bg-blue-100 text-blue-800",
  TRAINER: "bg-green-100 text-green-800",
};

export default function NewManagerPage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [actualSearchQuery, setActualSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUserItem | null>(null);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);

  // 사용자 검색
  const {
    data: searchResults = [],
    error: searchError,
    isLoading: searchLoading,
  } = useSWR<SearchUsersForManagerResult>(
    actualSearchQuery.trim()
      ? `/api/manager/centers/new-manager?search=${encodeURIComponent(
          actualSearchQuery.trim()
        )}`
      : null,
    fetcher
  );

  // 센터 목록 조회
  const { data: centers = [] } = useSWR("/api/fitness-center", fetcher);

  const handleSearch = () => {
    if (inputValue.trim()) {
      setIsSearching(true);
      setActualSearchQuery(inputValue.trim());
      // SWR이 자동으로 데이터를 가져옴
      setTimeout(() => setIsSearching(false), 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 매니저 변환
  const { trigger: convertToManager, isMutating: isConverting } =
    useSWRMutation("/api/manager/centers/new-manager", convertMutator, {
      onSuccess: (data) => {
        router.push("/manager/centers");
      },
      onError: (error) => {
        alert(`변환 실패: ${error.message}`);
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      alert("변환할 사용자를 선택해주세요.");
      return;
    }

    await convertToManager({
      userId: selectedUser.id,
      fitnessCenterIds: selectedCenters,
    });
  };

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/manager/centers"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">새 매니저 등록</h1>
          <p className="text-gray-600 mt-1">
            회원 또는 트레이너를 매니저로 변환합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 사용자 검색 섹션 */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">사용자 검색</h2>

              {/* 검색창 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">사용자 이름으로 검색</span>
                </label>
                <div className="input-group flex items-center">
                  <input
                    type="text"
                    placeholder="사용자 이름을 입력하세요"
                    className="input input-bordered flex-1"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="btn btn-square"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 검색 결과 */}
              <div className="mt-4">
                {(isSearching || searchLoading) && (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                )}

                {searchError && (
                  <div className="alert alert-error">
                    <span>검색 중 오류가 발생했습니다.</span>
                  </div>
                )}

                {!isSearching &&
                  !searchLoading &&
                  actualSearchQuery.trim() &&
                  searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      검색 결과가 없습니다.
                    </div>
                  )}

                {!isSearching && !searchLoading && searchResults.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                              {user.avatarImageId ? (
                                <ProfileImagePreview
                                  imageId={user.avatarImageId}
                                  variant="avatar"
                                  size="sm"
                                  fallback={
                                    <span className="text-sm font-bold">
                                      {user.username[0]}
                                    </span>
                                  }
                                />
                              ) : (
                                <span className="text-sm font-bold">
                                  {user.username[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{user.username}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  roleColors[user.role]
                                }`}
                              >
                                {roleLabels[user.role]}
                              </span>
                              {selectedUser?.id === user.id && (
                                <Check className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.mobile && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.mobile}
                              </div>
                            )}
                            {user.memberProfile?.createdAt && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                회원 가입:{" "}
                                {new Date(
                                  user.memberProfile.createdAt
                                ).toLocaleDateString("ko-KR")}
                              </div>
                            )}
                            {user.trainerProfile?.createdAt && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                트레이너 등록:{" "}
                                {new Date(
                                  user.trainerProfile.createdAt
                                ).toLocaleDateString("ko-KR")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!actualSearchQuery.trim() && (
                  <div className="text-center py-8 text-gray-500">
                    사용자 이름을 입력하고 검색 버튼을 클릭하거나 Enter를
                    눌러주세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 매니저 변환 섹션 */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">매니저 변환</h2>

              {selectedUser ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 선택된 사용자 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">선택된 사용자</h3>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                          {selectedUser.avatarImageId ? (
                            <ProfileImagePreview
                              imageId={selectedUser.avatarImageId}
                              variant="avatar"
                              size="sm"
                              fallback={
                                <span className="text-sm font-bold">
                                  {selectedUser.username[0]}
                                </span>
                              }
                            />
                          ) : (
                            <span className="text-sm font-bold">
                              {selectedUser.username[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {selectedUser.username}
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              roleColors[selectedUser.role]
                            }`}
                          >
                            {roleLabels[selectedUser.role]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedUser.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 센터 선택 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        담당할 피트니스 센터 (복수 선택 가능)
                      </span>
                    </label>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-white">
                      {centers.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          등록된 센터가 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {centers.map((center: any) => (
                            <label
                              key={center.id}
                              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary"
                                value={center.id}
                                checked={selectedCenters.includes(center.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCenters([
                                      ...selectedCenters,
                                      center.id,
                                    ]);
                                  } else {
                                    setSelectedCenters(
                                      selectedCenters.filter(
                                        (id) => id !== center.id
                                      )
                                    );
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {center.title}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {center.address}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedCenters.length > 0 && (
                      <div className="label">
                        <span className="label-text-alt text-primary">
                          {selectedCenters.length}개 센터 선택됨
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 미리보기 */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">변환 미리보기</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>이름: {selectedUser.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">현재 역할:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            roleColors[selectedUser.role]
                          }`}
                        >
                          {roleLabels[selectedUser.role]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>새 역할: </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          매니저
                        </span>
                      </div>
                      {selectedCenters.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="font-medium mb-1">담당 센터:</div>
                          <div className="space-y-1">
                            {selectedCenters.map((centerId) => {
                              const center = centers.find(
                                (c: any) => c.id === centerId
                              );
                              return center ? (
                                <div
                                  key={centerId}
                                  className="text-xs text-gray-700 pl-2"
                                >
                                  • {center.title}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 주의사항 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      주의사항
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>
                        • 기존 {roleLabels[selectedUser.role]} 프로필은
                        유지됩니다.
                      </li>
                      <li>
                        • 매니저 권한으로 변경되어 시스템 관리가 가능해집니다.
                      </li>
                      <li>
                        • 변경 후에는 되돌릴 수 없으니 신중히 결정해주세요.
                      </li>
                    </ul>
                  </div>

                  {/* 제출 버튼 */}
                  <button
                    type="submit"
                    disabled={isConverting}
                    className="btn btn-primary w-full"
                  >
                    {isConverting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        변환 중...
                      </>
                    ) : (
                      "매니저로 변환"
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  변환할 사용자를 먼저 선택해주세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
