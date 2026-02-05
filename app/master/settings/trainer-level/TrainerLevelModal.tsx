"use client";

import { useState, useEffect } from "react";
import { X, User, Check } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import useSWR from "swr";
import type { IAllTrainersForLevel } from "@/app/services/master/master-trainer.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TrainerLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingLevel?: {
    id: string;
    title: string;
    displayTitle: string;
    trainerIds: string[];
  } | null;
  onMutate?: () => void; // 부모 컴포넌트의 데이터 갱신용
}

const TrainerLevelModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingLevel,
  onMutate,
}: TrainerLevelModalProps) => {
  const [title, setTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 모든 트레이너 목록 조회
  const { data: trainers, isLoading: trainersLoading } =
    useSWR<IAllTrainersForLevel>(
      "/api/master/trainers/level/trainers",
      fetcher
    );

  // 편집 모드일 때 초기값 설정
  useEffect(() => {
    if (editingLevel) {
      setTitle(editingLevel.title);
      setDisplayTitle(editingLevel.displayTitle);
      setSelectedTrainerIds(editingLevel.trainerIds);
    } else {
      setTitle("");
      setDisplayTitle("");
      setSelectedTrainerIds([]);
    }
  }, [editingLevel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !displayTitle.trim()) {
      alert("레벨명과 표시명을 모두 입력해주세요.");
      return;
    }

    // 영문 검증
    if (!/^[A-Z_]+$/.test(title)) {
      alert("레벨명은 영문 대문자와 언더스코어(_)만 사용 가능합니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingLevel
        ? `/api/master/trainers/level/${editingLevel.id}`
        : "/api/master/trainers/level";

      const method = editingLevel ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          displayTitle: displayTitle.trim(),
          trainerIds: selectedTrainerIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "요청에 실패했습니다.");
      }

      alert(
        editingLevel
          ? "레벨이 성공적으로 수정되었습니다."
          : "레벨이 성공적으로 생성되었습니다."
      );

      // 부모 컴포넌트의 레벨 목록 데이터 갱신
      if (onMutate) {
        onMutate();
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrainerSelection = (trainerId: string) => {
    setSelectedTrainerIds((prev) =>
      prev.includes(trainerId)
        ? prev.filter((id) => id !== trainerId)
        : [...prev, trainerId]
    );
  };

  // 검색 필터링
  const filteredTrainers = trainers?.filter((trainer) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      trainer.user.username.toLowerCase().includes(query) ||
      trainer.user.realname?.toLowerCase().includes(query) ||
      trainer.fitnessCenter?.title.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editingLevel ? "트레이너 레벨 수정" : "새 트레이너 레벨 생성"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Title (영문 레벨명) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                레벨명 (영문) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                placeholder="JUNIOR"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                영문 대문자와 언더스코어(_)만 사용 가능합니다
              </p>
            </div>

            {/* Display Title (한글 표시명) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                표시명 (한글) *
              </label>
              <input
                type="text"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder="주니어"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-blue-600 mt-1">
                ℹ️ 이 이름이 외부에 보여집니다
              </p>
            </div>

            {/* Trainer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                할당 트레이너 (선택)
              </label>

              {/* 검색 */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="트레이너 검색..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
              />

              {/* 선택된 트레이너 수 */}
              <div className="mb-2">
                <span className="text-sm text-gray-600">
                  선택된 트레이너: {selectedTrainerIds.length}명
                </span>
              </div>

              {/* 트레이너 목록 */}
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {trainersLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : !filteredTrainers || filteredTrainers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchQuery
                      ? "검색 결과가 없습니다"
                      : "등록된 트레이너가 없습니다"}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredTrainers.map((trainer) => {
                      const isSelected = selectedTrainerIds.includes(
                        trainer.id
                      );
                      const currentLevel = trainer.level?.displayTitle;

                      return (
                        <div
                          key={trainer.id}
                          onClick={() => toggleTrainerSelection(trainer.id)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">
                                    {trainer.user.realname || "실명 미등록"}
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    @{trainer.user.username}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                  {trainer.fitnessCenter && (
                                    <span className="truncate">
                                      {trainer.fitnessCenter.title}
                                    </span>
                                  )}
                                  {currentLevel && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                                      현재: {currentLevel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "처리 중..."
                : editingLevel
                ? "수정하기"
                : "생성하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainerLevelModal;
