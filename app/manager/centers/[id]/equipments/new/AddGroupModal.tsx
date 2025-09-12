"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { X } from "lucide-react";

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 성공 시 부모 컴포넌트의 데이터 새로고침 콜백
}

const createGroupFetcher = async (
  url: string,
  { arg }: { arg: { name: string; description?: string } }
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create group");
  }

  return response.json();
};

export default function AddGroupModal({
  isOpen,
  onClose,
  onSuccess,
}: AddGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { trigger: createGroup, isMutating } = useSWRMutation(
    "/api/equipments/group",
    createGroupFetcher
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("그룹명을 입력해주세요.");
      return;
    }

    try {
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // 성공 시 폼 리셋 및 모달 닫기
      setName("");
      setDescription("");
      onClose();
      onSuccess(); // 부모 컴포넌트의 데이터 새로고침
      alert("그룹이 성공적으로 생성되었습니다!");
    } catch (error: any) {
      console.error("Failed to create group:", error);
      alert(error.message || "그룹 생성에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">새 그룹 추가</h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isMutating}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 그룹명 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">그룹명 *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 덤벨, 바벨, 케틀벨"
              required
              disabled={isMutating}
            />
          </div>

          {/* 설명 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">설명</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="그룹에 대한 설명 (선택사항)"
              rows={3}
              disabled={isMutating}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isMutating}
            >
              {isMutating ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "그룹 생성"
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={isMutating}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}