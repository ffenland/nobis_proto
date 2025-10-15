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
  Building,
} from "lucide-react";
import {
  SearchMembersResult,
  SearchMemberItem,
  GetAllTrainerLevelsResult,
} from "@/app/services/manager/manager-trainer.service";
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

export default function NewTrainerPage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [actualSearchQuery, setActualSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchMemberItem | null>(
    null
  );
  const [formData, setFormData] = useState({
    levelId: "",
    fitnessCenterId: "",
    realname: "",
  });

  // 회원 검색
  const {
    data: searchResults = [],
    error: searchError,
    isLoading: searchLoading,
  } = useSWR<SearchMembersResult>(
    actualSearchQuery.trim()
      ? `/api/manager/trainers/new?search=${encodeURIComponent(
          actualSearchQuery.trim()
        )}`
      : null,
    fetcher
  );

  // 센터 목록 조회
  const { data: centers = [] } = useSWR("/api/fitness-center", fetcher);

  // 트레이너 레벨 목록 조회
  const { data: levels = [], isLoading: levelsLoading } =
    useSWR<GetAllTrainerLevelsResult>("/api/manager/trainers/level", fetcher);

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

  // 트레이너 변환
  const { trigger: convertToTrainer, isMutating: isConverting } =
    useSWRMutation("/api/manager/trainers/new", convertMutator, {
      onSuccess: (data) => {
        router.push(`/manager/trainers/${data.trainerId}`);
      },
      onError: (error) => {
        alert(`변환 실패: ${error.message}`);
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMember) {
      alert("변환할 회원을 선택해주세요.");
      return;
    }

    if (!formData.realname.trim()) {
      alert("실명을 입력해주세요.");
      return;
    }

    await convertToTrainer({
      userId: selectedMember.id,
      realname: formData.realname.trim(),
      levelId: formData.levelId || undefined,
      fitnessCenterId: formData.fitnessCenterId || undefined,
    });
  };

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/manager/trainers"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">새 트레이너 등록</h1>
          <p className="text-gray-600 mt-1">회원을 트레이너로 변환합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 회원 검색 섹션 */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">회원 검색</h2>

              {/* 검색창 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">회원 이름으로 검색</span>
                </label>
                <div className="input-group flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="회원 이름을 입력하세요"
                    className="input input-bordered flex-1"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
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
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedMember?.id === member.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          setSelectedMember(member);
                          setFormData({
                            ...formData,
                            realname: member.realname || "",
                          });
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                              {member.avatarImageId ? (
                                <ProfileImagePreview
                                  imageId={member.avatarImageId}
                                  variant="avatar"
                                  size="sm"
                                  fallback={
                                    <span className="text-sm font-bold">
                                      {member.username[0]}
                                    </span>
                                  }
                                />
                              ) : (
                                <span className="text-sm font-bold">
                                  {member.username[0]}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{member.username}</h3>
                              {selectedMember?.id === member.id && (
                                <Check className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              실명: {member.realname || "실명 미입력"}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </div>
                            {member.mobile && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {member.mobile}
                              </div>
                            )}
                            {member.memberCreatedAt && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                가입일:{" "}
                                {new Date(
                                  member.memberCreatedAt
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
                    회원 이름을 입력하고 검색 버튼을 클릭하거나 Enter를
                    눌러주세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 트레이너 설정 섹션 */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">트레이너 정보 설정</h2>

              {selectedMember ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 선택된 회원 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">선택된 회원</h3>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12">
                          {selectedMember.avatarImageId ? (
                            <ProfileImagePreview
                              imageId={selectedMember.avatarImageId}
                              variant="avatar"
                              size="sm"
                              fallback={
                                <span className="text-sm font-bold">
                                  {selectedMember.username[0]}
                                </span>
                              }
                            />
                          ) : (
                            <span className="text-sm font-bold">
                              {selectedMember.username[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">
                          {selectedMember.username}
                        </div>
                        <div className="text-sm text-gray-600">
                          실명: {selectedMember.realname || "실명 미입력"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedMember.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 실명 입력 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">실명 *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="실명을 입력하세요"
                      className="input input-bordered"
                      value={formData.realname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          realname: e.target.value,
                        })
                      }
                      required
                      minLength={2}
                    />
                    <label className="label">
                      <span className="label-text-alt text-gray-500">
                        트레이너로 전환 시 실명이 필요합니다.
                      </span>
                    </label>
                  </div>

                  {/* 트레이너 레벨 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        트레이너 레벨
                      </span>
                    </label>
                    {levelsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="ml-2 text-sm text-gray-500">
                          레벨 목록 로딩 중...
                        </span>
                      </div>
                    ) : levels.length === 0 ? (
                      <div className="alert alert-info">
                        <span>
                          등록된 트레이너 레벨이 없습니다. 레벨 없이 트레이너로
                          전환됩니다.
                        </span>
                      </div>
                    ) : (
                      <>
                        <select
                          className="select select-bordered"
                          value={formData.levelId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              levelId: e.target.value,
                            })
                          }
                        >
                          <option value="">레벨 선택 (선택사항)</option>
                          {levels.map((level) => (
                            <option key={level.id} value={level.id}>
                              {level.displayTitle}
                            </option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt text-gray-500">
                            레벨을 선택하지 않으면 레벨 없이 트레이너로
                            전환됩니다.
                          </span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* 피트니스 센터 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        피트니스 센터
                      </span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={formData.fitnessCenterId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fitnessCenterId: e.target.value,
                        })
                      }
                    >
                      <option value="">센터 선택 (선택사항)</option>
                      {centers.map((center: any) => (
                        <option key={center.id} value={center.id}>
                          {center.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 미리보기 */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">설정 미리보기</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>이름: {selectedMember.username}</span>
                      </div>
                      {formData.realname && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>실명: {formData.realname}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {formData.levelId
                            ? levels.find((l) => l.id === formData.levelId)
                                ?.displayTitle || ""
                            : "레벨 없음"}
                        </span>
                      </div>
                      {formData.fitnessCenterId && (
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>
                            센터:{" "}
                            {centers.find(
                              (c: any) => c.id === formData.fitnessCenterId
                            )?.title || ""}
                          </span>
                        </div>
                      )}
                    </div>
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
                      "트레이너로 변환"
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  변환할 회원을 먼저 선택해주세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
