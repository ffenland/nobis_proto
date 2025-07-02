// app/manager/product/pt/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import Link from "next/link";
import {
  IPtProductDetail,
  ITrainerForSelection,
} from "@/app/lib/services/product.service";

interface IPtProductEditFormData {
  price: number;
  description: string;
  totalCount: number;
  time: number;
  onSale: boolean;
  isLimitedTime: boolean;
  openedAt: string;
  closedAt: string;
  trainerIds: string[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// 시간 옵션 생성 (10분 단위, 10분~120분)
const generateTimeOptions = () => {
  const options = [];
  for (let i = 10; i <= 120; i += 10) {
    const hours = Math.floor(i / 60);
    const minutes = i % 60;
    let label = "";

    if (hours > 0) {
      label += `${hours}시간`;
      if (minutes > 0) {
        label += ` ${minutes}분`;
      }
    } else {
      label = `${minutes}분`;
    }

    options.push({ value: i, label });
  }
  return options;
};

const PtProductEditPage = ({ params }: PageProps) => {
  const router = useRouter();
  const [ptId, setPtId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [originalData, setOriginalData] = useState<IPtProductDetail | null>(
    null
  );

  // params 해결
  useEffect(() => {
    params.then((resolvedParams) => {
      setPtId(resolvedParams.id);
    });
  }, [params]);

  // PT 상품 상세 데이터 조회
  const {
    data: ptProduct,
    error: ptProductError,
    isLoading: ptProductLoading,
  } = useSWR<IPtProductDetail>(
    ptId ? `/api/manager/product/pt/${ptId}` : null,
    fetcher
  );

  // 트레이너 목록 조회
  const {
    data: trainers,
    error: trainersError,
    isLoading: trainersLoading,
  } = useSWR<ITrainerForSelection[]>("/api/manager/product/pt", fetcher);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<IPtProductEditFormData>();

  const isLimitedTime = watch("isLimitedTime");
  const selectedTrainerIds = watch("trainerIds") || [];
  const selectedTime = watch("time");

  // 시간 옵션들
  const timeOptions = generateTimeOptions();

  // PT 상품 데이터가 로드되면 폼에 설정
  useEffect(() => {
    if (ptProduct) {
      setOriginalData(ptProduct);

      const isLimited = new Date(ptProduct.closedAt).getFullYear() !== 2199;

      reset({
        price: ptProduct.price,
        description: ptProduct.description,
        totalCount: ptProduct.totalCount,
        time: ptProduct.time,
        onSale: ptProduct.onSale,
        isLimitedTime: isLimited,
        openedAt: new Date(ptProduct.openedAt).toISOString().split("T")[0],
        closedAt: isLimited
          ? new Date(ptProduct.closedAt).toISOString().split("T")[0]
          : "2199-12-31",
        trainerIds: ptProduct.trainerIds,
      });
    }
  }, [ptProduct, reset]);

  // 트레이너 선택/해제 핸들러
  const handleTrainerToggle = (trainerId: string) => {
    const currentIds = selectedTrainerIds;
    if (currentIds.includes(trainerId)) {
      setValue(
        "trainerIds",
        currentIds.filter((id) => id !== trainerId)
      );
    } else {
      setValue("trainerIds", [...currentIds, trainerId]);
    }
  };

  // 모든 트레이너 선택/해제
  const handleSelectAllTrainers = () => {
    if (!trainers) return;

    if (selectedTrainerIds.length === trainers.length) {
      setValue("trainerIds", []);
    } else {
      setValue(
        "trainerIds",
        trainers.map((trainer) => trainer.id)
      );
    }
  };

  // 시간 선택 핸들러
  const handleTimeSelect = (timeValue: number) => {
    setValue("time", timeValue);
    setIsTimeDropdownOpen(false);
  };

  // 선택된 시간의 라벨 찾기
  const getSelectedTimeLabel = () => {
    const selectedOption = timeOptions.find(
      (option) => option.value === selectedTime
    );
    return selectedOption ? selectedOption.label : "60분";
  };

  const onSubmit = async (data: IPtProductEditFormData) => {
    if (!originalData) {
      setError("원본 데이터를 불러오지 못했습니다.");
      return;
    }

    if (data.trainerIds.length === 0) {
      setError("최소 한 명의 트레이너를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = {
        price: data.price,
        description: data.description,
        totalCount: data.totalCount,
        time: data.time,
        onSale: data.onSale,
        openedAt: data.openedAt,
        closedAt: data.isLimitedTime
          ? data.closedAt
          : "2199-12-31T23:59:59.999Z",
        trainerIds: data.trainerIds,
      };

      const response = await fetch(`/api/manager/product/pt/${ptId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "PT 상품 수정에 실패했습니다.");
      }

      router.push(`/manager/product/pt/${ptId}`);
    } catch (error) {
      console.error("PT 상품 수정 실패:", error);
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ptProductLoading || trainersLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center">
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (ptProductError || trainersError || !ptProduct) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              데이터를 불러오는데 실패했습니다.
            </p>
            <Link
              href="/manager/product"
              className="text-blue-600 hover:text-blue-800"
            >
              ← 뒤로가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">PT 상품 수정</h1>
          <Link
            href={`/manager/product/pt/${ptId}`}
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
          {/* trainerIds를 React Hook Form에 등록 */}
          <input
            type="hidden"
            {...register("trainerIds", {
              required: "최소 한 명의 트레이너를 선택해주세요.",
              validate: (value) =>
                value.length > 0 || "최소 한 명의 트레이너를 선택해주세요.",
            })}
          />

          {/* 상품명 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상품명 (수정 불가)
            </label>
            <input
              type="text"
              value={ptProduct.title}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">
              상품명은 수정할 수 없습니다.
            </p>
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

          {/* 총 횟수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              총 횟수 *
            </label>
            <input
              type="number"
              {...register("totalCount", {
                required: "총 횟수를 입력해주세요.",
                min: { value: 1, message: "최소 1회 이상이어야 합니다." },
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="1"
            />
            {errors.totalCount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.totalCount.message}
              </p>
            )}
          </div>

          {/* 수업 시간 - 드롭다운 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수업 시간 *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white text-left flex items-center justify-between"
              >
                <span>{getSelectedTimeLabel()}</span>
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isTimeDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {timeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTimeSelect(option.value)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                        selectedTime === option.value
                          ? "bg-gray-50 text-gray-900 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden input for React Hook Form */}
            <input
              type="hidden"
              {...register("time", {
                required: "수업 시간을 선택해주세요.",
                min: { value: 10, message: "최소 10분 이상이어야 합니다." },
                max: { value: 120, message: "최대 120분까지 선택 가능합니다." },
              })}
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
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

          {/* 담당 트레이너 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              담당 트레이너 선택 *
            </label>
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">
                  선택된 트레이너: {selectedTrainerIds.length}명 /{" "}
                  {trainers?.length || 0}명
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllTrainers}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedTrainerIds.length === trainers?.length
                    ? "전체 해제"
                    : "전체 선택"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {trainers?.map((trainer) => (
                  <label
                    key={trainer.id}
                    className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTrainerIds.includes(trainer.id)}
                      onChange={() => handleTrainerToggle(trainer.id)}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      {trainer.user.username}
                    </span>
                  </label>
                ))}
              </div>

              {selectedTrainerIds.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  최소 한 명의 트레이너를 선택해주세요.
                </p>
              )}
            </div>
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
              href={`/manager/product/pt/${ptId}`}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {isSubmitting ? "수정 중..." : "수정 완료"}
            </button>
          </div>
        </form>
      </div>

      {/* 드롭다운이 열려있을 때 백그라운드 클릭으로 닫기 */}
      {isTimeDropdownOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsTimeDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default PtProductEditPage;
