"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { X } from "lucide-react";

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 성공 시 부모 컴포넌트의 데이터 새로고침 콜백
}

const createBrandFetcher = async (
  url: string,
  { arg }: { arg: { name: string } }
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create brand");
  }

  return response.json();
};

export default function AddBrandModal({
  isOpen,
  onClose,
  onSuccess,
}: AddBrandModalProps) {
  const [name, setName] = useState("");

  const { trigger: createBrand, isMutating } = useSWRMutation(
    "/api/equipments/brand",
    createBrandFetcher
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("브랜드명을 입력해주세요.");
      return;
    }

    try {
      await createBrand({
        name: name.trim(),
      });

      // 성공 시 폼 리셋 및 모달 닫기
      setName("");
      onClose();
      onSuccess(); // 부모 컴포넌트의 데이터 새로고침
      alert("브랜드가 성공적으로 생성되었습니다!");
    } catch (error: any) {
      console.error("Failed to create brand:", error);
      alert(error.message || "브랜드 생성에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">새 브랜드 추가</h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isMutating}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 브랜드명 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">브랜드명 *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Nike, Adidas, PowerTech"
              required
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
                "브랜드 생성"
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