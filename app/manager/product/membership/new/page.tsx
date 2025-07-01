// app/manager/product/membership/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";

interface IMembershipProductFormData {
  title: string;
  price: number;
  description: string;
  totalCount: number;
  onSale: boolean;
  isLimitedTime: boolean;
  openedAt: string;
  closedAt: string;
}

const MembershipProductNewPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IMembershipProductFormData>({
    defaultValues: {
      title: "",
      price: 0,
      description: "",
      totalCount: 30,
      onSale: true,
      isLimitedTime: false,
      openedAt: new Date().toISOString().split("T")[0],
      closedAt: "2199-12-31",
    },
  });

  const isLimitedTime = watch("isLimitedTime");

  const onSubmit = async (data: IMembershipProductFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = {
        title: data.title,
        price: data.price,
        description: data.description,
        totalCount: data.totalCount,
        onSale: data.onSale,
        openedAt: data.openedAt,
        closedAt: data.isLimitedTime
          ? data.closedAt
          : "2199-12-31T23:59:59.999Z",
      };

      const response = await fetch("/api/manager/product/membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "멤버십 상품 생성에 실패했습니다.");
      }

      const result = await response.json();
      router.push(`/manager/product/membership/${result.id}`);
    } catch (error) {
      console.error("멤버십 상품 생성 실패:", error);
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            새 멤버십 상품 등록
          </h1>
          <Link
            href="/manager/product"
            className="text-gray-600 hover:text-gray-800"
          >
            ← 뒤로가기
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 상품명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상품명 *
            </label>
            <input
              type="text"
              {...register("title", { required: "상품명을 입력해주세요." })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="멤버십 상품명을 입력하세요"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* 가격 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가격 (원) *
            </label>
            <input
              type="number"
              {...register("price", {
                required: "가격을 입력해주세요.",
                min: { value: 0, message: "가격은 0원 이상이어야 합니다." },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="0"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">
                {errors.price.message}
              </p>
            )}
          </div>

          {/* 총 일수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              총 일수 *
            </label>
            <input
              type="number"
              {...register("totalCount", {
                required: "총 일수를 입력해주세요.",
                min: { value: 1, message: "최소 1일 이상이어야 합니다." },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="30"
            />
            {errors.totalCount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.totalCount.message}
              </p>
            )}
          </div>

          {/* 상품 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상품 설명
            </label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="상품에 대한 자세한 설명을 입력하세요"
            />
          </div>

          {/* 판매 상태 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register("onSale")}
              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">판매 중</label>
          </div>

          {/* 기간 제한 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register("isLimitedTime")}
                className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                판매 기간 제한
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  판매 시작일
                </label>
                <input
                  type="date"
                  {...register("openedAt", {
                    required: "판매 시작일을 선택해주세요.",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                {errors.openedAt && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.openedAt.message}
                  </p>
                )}
              </div>

              {isLimitedTime && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매 종료일
                  </label>
                  <input
                    type="date"
                    {...register("closedAt", {
                      required: isLimitedTime
                        ? "판매 종료일을 선택해주세요."
                        : false,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                  {errors.closedAt && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.closedAt.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/manager/product"
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {isSubmitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MembershipProductNewPage;
