"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { GetPtProductDetailResult } from "@/app/services/master/product.service";
import type { IAllTrainerLevelsSimple } from "@/app/services/master/master-trainer.service";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { Edit, X, Check, Save } from "lucide-react";
import { LoadingSpinner } from "@/app/components/ui/Loading";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const updateFetcher = async (url: string) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "요청 처리 중 오류가 발생했습니다.");
  }

  return response.json();
};

const ManagerPtDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isEditingLevels, setIsEditingLevels] = useState(false);
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const productId = params.id as string;

  const {
    data: product,
    error,
    isLoading,
    mutate,
  } = useSWR<GetPtProductDetailResult>(
    `/api/master/product/pt/${productId}`,
    fetcher
  );

  // TrainerLevels 목록 조회
  const { data: allLevels, isLoading: levelsLoading } =
    useSWR<IAllTrainerLevelsSimple>(
      "/api/master/trainers/level/simple",
      fetcher
    );

  const { trigger: stopSale, isMutating } = useSWRMutation(
    `/api/master/product/pt/${productId}`,
    updateFetcher,
    {
      onSuccess: (data) => {
        if (data.action === "deleted") {
          toast.success("PT 상품이 삭제되었습니다.");
          router.push("/master/product");
        } else {
          toast.success("PT 상품 판매가 중지되었습니다.");
          mutate(); // 데이터 리프레시
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleStopSale = async () => {
    setShowConfirmDialog(true);
  };

  const confirmStopSale = async () => {
    setShowConfirmDialog(false);
    await stopSale();
  };

  const handleEditLevels = () => {
    if (product) {
      setSelectedLevelIds(
        product.trainerLevels.map((tl) => tl.trainerLevel.id)
      );
      setIsEditingLevels(true);
    }
  };

  const handleCancelEditLevels = () => {
    setIsEditingLevels(false);
    setSelectedLevelIds([]);
  };

  const toggleLevelSelection = (levelId: string) => {
    setSelectedLevelIds((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleSaveLevels = async () => {
    try {
      const response = await fetch(`/api/master/product/pt/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerLevelIds: selectedLevelIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "레벨 수정에 실패했습니다.");
      }

      toast.success("트레이너 레벨이 성공적으로 수정되었습니다.");
      setIsEditingLevels(false);
      mutate(); // 데이터 리프레시
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "레벨 수정 중 오류가 발생했습니다."
      );
    }
  };

  const handleEditDescription = () => {
    if (product) {
      setEditedDescription(product.description || "");
      setIsEditingDescription(true);
    }
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription("");
  };

  const handleSaveDescription = async () => {
    if (!productId) return;

    setIsSavingDescription(true);
    try {
      const response = await fetch(`/api/master/product/pt/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "설명 수정에 실패했습니다.");
      }

      toast.success("상품 설명이 성공적으로 수정되었습니다.");
      setIsEditingDescription(false);
      mutate(); // 데이터 리프레시
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "설명 수정 중 오류가 발생했습니다."
      );
    } finally {
      setIsSavingDescription(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-red-500 mb-4">
          {error?.message || "상품 정보를 불러올 수 없습니다."}
        </div>
        <Button
          onClick={() => router.push("/master/product")}
          variant="outline"
        >
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-baseline">
        <PageHeader
          title="PT 상품 상세"
          subtitle="PT 상품의 상세 정보를 확인하고 관리합니다"
        />
        <Button
          onClick={() => router.push("/master/product")}
          variant="default"
        >
          목록으로 돌아가기
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {product.title}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  product.onSale
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {product.onSale ? "판매중" : "판매중단"}
              </span>
              {product.onSale && (
                <Button
                  className="whitespace-pre-line"
                  onClick={handleStopSale}
                  variant="danger"
                  size="sm"
                  disabled={isMutating}
                >
                  {isMutating ? "처리중..." : "상품판매\n종료하기"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  가격
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {product.price.toLocaleString()}원
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  유효 기간
                </label>
                <p className="text-lg text-gray-900">
                  {product.expiration_period}일
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  인센티브
                </label>
                <p className="text-lg text-gray-900">
                  {product.incentivePercent}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  총 레슨 횟수
                </label>
                <p className="text-lg text-gray-900">{product.totalCount}회</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  레슨 시간
                </label>
                <p className="text-lg text-gray-900">{product.time}분</p>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-600">
                    트레이너 레벨
                  </label>
                  {!isEditingLevels && product.onSale && (
                    <button
                      onClick={handleEditLevels}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      레벨 범위 편집
                    </button>
                  )}
                </div>

                {isEditingLevels ? (
                  <div className="space-y-3">
                    {levelsLoading ? (
                      <div className="text-sm text-gray-500">로딩중...</div>
                    ) : !allLevels || allLevels.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        등록된 레벨이 없습니다
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                        {allLevels.map((level) => (
                          <label
                            key={level.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLevelIds.includes(level.id)}
                              onChange={() => toggleLevelSelection(level.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm font-medium">
                              {level.displayTitle}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({level.title})
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveLevels}
                        disabled={selectedLevelIds.length === 0}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <Check className="w-3 h-3" />
                        저장
                      </button>
                      <button
                        onClick={handleCancelEditLevels}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        <X className="w-3 h-3" />
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.trainerLevels.length > 0 ? (
                      product.trainerLevels.map((tl) => (
                        <span
                          key={tl.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tl.trainerLevel.displayTitle}
                          {tl.incentiveRate !== null &&
                            tl.incentiveRate !== product.incentivePercent && (
                              <span className="ml-1 text-blue-600">
                                ({tl.incentiveRate}%)
                              </span>
                            )}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">레벨 미지정</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  진행중인 PT
                </label>
                <p className="text-lg font-semibold text-blue-600">
                  {product.pt.length}개
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  판매 시작일
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(product.openedAt)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  판매 종료일
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(product.closedAt).getTime() >
                  new Date("2099-01-01").getTime()
                    ? "무제한"
                    : formatDate(product.closedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-600">
                상품 설명
              </label>
              {!isEditingDescription && product.onSale && (
                <button
                  onClick={handleEditDescription}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  설명 편집
                </button>
              )}
            </div>

            {isEditingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-gray-900"
                  placeholder="상품 설명을 입력하세요..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDescription}
                    disabled={isSavingDescription}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSavingDescription ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        저장
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditDescription}
                    disabled={isSavingDescription}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <X className="w-3 h-3" />
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">
                {product.description || "설명이 없습니다."}
              </p>
            )}
          </div>

          {/* 메타 정보 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <span>생성일: {formatDate(product.createdAt)}</span>
              <span>수정일: {formatDate(product.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              판매 중지 확인
            </h3>
            <p className="text-gray-600 mb-6">
              {product.pt.length > 0
                ? `현재 ${product.pt.length}개의 진행중인 PT가 있습니다. 판매를 중지하시겠습니까?`
                : "연결된 PT가 없어 상품이 삭제됩니다. 계속하시겠습니까?"}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                disabled={isMutating}
              >
                취소
              </Button>
              <Button
                onClick={confirmStopSale}
                variant="danger"
                disabled={isMutating}
              >
                {isMutating ? "처리중..." : "확인"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPtDetailPage;
