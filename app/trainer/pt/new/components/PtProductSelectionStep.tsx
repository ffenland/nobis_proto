"use client";

import { useState } from "react";
import { ShoppingCart, Clock, Users, DollarSign } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import useSWR from "swr";
import type { GetPtProductsForTrainerResult } from "@/app/services/trainer/pt.service";
import { formatMinutesToKorean } from "@/app/lib/utils/time.utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PtProductSelectionStepProps {
  onNext: (selectedProduct: {
    id: string;
    title: string;
    price: number;
    totalCount: number;
    time: number;
    description: string;
  }) => void;
  onBack: () => void;
}

const PtProductSelectionStep = ({ onNext, onBack }: PtProductSelectionStepProps) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const {
    data: ptProducts,
    error,
    isLoading,
  } = useSWR<GetPtProductsForTrainerResult>("/api/trainer/pt/products", fetcher);

  const handleNext = () => {
    if (!selectedProductId || !ptProducts) {
      alert("PT 상품을 선택해주세요.");
      return;
    }

    const selectedProduct = ptProducts.find((p) => p.id === selectedProductId);
    if (!selectedProduct) {
      alert("선택된 PT 상품 정보를 찾을 수 없습니다.");
      return;
    }

    onNext({
      id: selectedProduct.id,
      title: selectedProduct.title,
      price: selectedProduct.price,
      totalCount: selectedProduct.totalCount,
      time: selectedProduct.time,
      description: selectedProduct.description || "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-gray-600">PT 상품 목록을 불러오는 중...</span>
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
              PT 상품 목록을 불러올 수 없습니다. 다시 시도해주세요.
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
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                PT 상품을 선택해주세요
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              회원에게 제공할 PT 상품을 선택해주세요. 트레이너님이 수업 가능한 상품만 표시됩니다.
            </p>

            {/* PT 상품 목록 */}
            <div className="space-y-4">
              {ptProducts && ptProducts.length > 0 ? (
                ptProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${
                        selectedProductId === product.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{product.title}</h4>
                          <input
                            type="radio"
                            checked={selectedProductId === product.id}
                            onChange={() => setSelectedProductId(product.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                        </div>

                        {product.description && (
                          <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              <span className="font-medium">가격:</span>{" "}
                              {product.price.toLocaleString()}원
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">
                              <span className="font-medium">총 횟수:</span> {product.totalCount}회
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-sm">
                              <span className="font-medium">수업 시간:</span> {formatMinutesToKorean(product.time)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          유효기간: {product.expiration_period}일
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">판매 중인 PT 상품이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          이전 단계
        </Button>
        <Button onClick={handleNext} disabled={!selectedProductId} className="min-w-[120px]">
          다음 단계
        </Button>
      </div>
    </div>
  );
};

export default PtProductSelectionStep;