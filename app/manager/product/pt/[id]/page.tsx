"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { GetPtProductDetailResult } from "@/app/services/manager/product.service";
import { toast } from "react-hot-toast";
import { useState } from "react";

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

  const productId = params.id as string;

  const {
    data: product,
    error,
    isLoading,
  } = useSWR<GetPtProductDetailResult>(
    `/api/manager/product/pt/${productId}`,
    fetcher
  );

  const { trigger: stopSale, isMutating } = useSWRMutation(
    `/api/manager/product/pt/${productId}`,
    updateFetcher,
    {
      revalidate: false, // 삭제 시 자동 리밸리데이션 방지
      onSuccess: (data) => {
        if (data.action === "deleted") {
          toast.success("PT 상품이 삭제되었습니다.");
          router.push("/manager/product");
        } else {
          toast.success("PT 상품 판매가 중지되었습니다.");
          router.refresh();
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
          onClick={() => router.push("/manager/product")}
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

  const formatTrainerLevel = (level: string) => {
    const levelMap: Record<string, string> = {
      JUNIOR: "주니어",
      ASSOCIATE: "어소시에이트",
      SENIOR: "시니어",
      MASTER: "마스터",
    };
    return levelMap[level] || level;
  };

  return (
    <>
      <PageHeader
        title="PT 상품 상세"
        subtitle="PT 상품의 상세 정보를 확인하고 관리합니다"
      />

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
                  onClick={handleStopSale}
                  variant="danger"
                  size="sm"
                  disabled={isMutating}
                >
                  {isMutating ? "처리중..." : "판매중지"}
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  트레이너 레벨
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {product.trainerLevel.length > 0 ? (
                    product.trainerLevel.map((level) => (
                      <span
                        key={level}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {formatTrainerLevel(level)}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">전체 레벨</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  연결된 트레이너
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {product.trainer.length > 0 ? (
                    product.trainer.map((trainer) => (
                      <span
                        key={trainer.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {trainer.user.username}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">연결된 트레이너 없음</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  진행중인 PT
                </label>
                <p className="text-lg font-semibold text-blue-600">
                  {product.confirmedPtCount}개
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
            <label className="block text-sm font-medium text-gray-600 mb-2">
              상품 설명
            </label>
            <p className="text-gray-900 whitespace-pre-wrap">
              {product.description || "설명이 없습니다."}
            </p>
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
              {product.confirmedPtCount > 0
                ? `현재 ${product.confirmedPtCount}개의 진행중인 PT가 있습니다. 판매를 중지하시겠습니까?`
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
    </>
  );
};

export default ManagerPtDetailPage;
