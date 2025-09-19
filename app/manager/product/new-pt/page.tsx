"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import useSWRMutation from "swr/mutation";
import { TrainerLevel } from "@prisma/client";
import {
  type CreatePtProductInput,
  type CreatePtProductResult
} from "@/app/services/manager/product.service";

// Form data type
interface PtProductFormData {
  title: string;
  description: string;
  price: number;
  totalCount: number;
  time: number;
  expiration_period: number;
  incentivePercent: number;
  trainerLevels: TrainerLevel[];
}

export default function NewPtProductPage() {
  const router = useRouter();
  const [selectedTrainerLevels, setSelectedTrainerLevels] = useState<
    TrainerLevel[]
  >([]);

  // SWR Mutation for PT 상품 생성
  const { trigger: createProduct, isMutating } = useSWRMutation(
    "create-pt-product",
    async (_, { arg }: { arg: CreatePtProductInput }) => {
      const response = await fetch("/api/manager/product/pt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "PT 상품 생성에 실패했습니다.");
      }

      return response.json() as Promise<CreatePtProductResult>;
    }
  );

  // React Hook Form 설정
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PtProductFormData>({
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      totalCount: 1,
      time: 60,
      expiration_period: 30,
      incentivePercent: 0,
      trainerLevels: [],
    },
  });

  // Form values watch
  const watchedValues = watch();

  // TrainerLevel options
  const trainerLevelOptions: {
    value: TrainerLevel;
    label: string;
    description: string;
  }[] = [
    { value: "JUNIOR", label: "주니어", description: "신입 트레이너" },
    { value: "ASSOCIATE", label: "어소시에이트", description: "경력 트레이너" },
    { value: "SENIOR", label: "시니어", description: "숙련 트레이너" },
    { value: "MASTER", label: "마스터", description: "전문 트레이너" },
  ];

  // TrainerLevel selection handler
  const handleTrainerLevelChange = (level: TrainerLevel) => {
    setSelectedTrainerLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  // Real-time calculations
  const calculations = useMemo(() => {
    const { price, totalCount, time } = watchedValues;

    const pricePerLesson =
      price && totalCount ? Math.round(price / totalCount) : 0;
    const pricePerMinute =
      pricePerLesson && time ? Math.round(pricePerLesson / time) : 0;
    const totalMinutes = totalCount && time ? totalCount * time : 0;
    const totalHours = totalMinutes
      ? Math.round((totalMinutes / 60) * 10) / 10
      : 0;

    return {
      pricePerLesson,
      pricePerMinute,
      totalMinutes,
      totalHours,
    };
  }, [watchedValues]);

  // Form submit handler
  const onSubmit = async (data: PtProductFormData) => {
    try {
      if (selectedTrainerLevels.length === 0) {
        alert("최소 하나의 트레이너 레벨을 선택해주세요.");
        return;
      }

      const createInput: CreatePtProductInput = {
        ...data,
        trainerLevels: selectedTrainerLevels,
        managerId: "", // This will be filled from session on server
      };

      const result = await createProduct(createInput);

      // result는 이제 CreatePtProductResult 타입
      alert("PT 상품이 성공적으로 생성되었습니다.");
      router.push(`/manager/product/pt/${result.id}`);
    } catch (error) {
      console.error("PT 상품 생성 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "PT 상품 생성 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">새로운 PT 상품 생성</h1>
        <p className="text-gray-600">새로운 PT 상품을 생성하세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic info */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title mb-4">기본 정보</h2>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">상품명 *</span>
                  </label>
                  <input
                    type="text"
                    className={`input input-bordered ${
                      errors.title ? "input-error" : ""
                    }`}
                    placeholder="PT 상품명을 입력하세요"
                    {...register("title", {
                      required: "상품명을 입력하세요",
                      minLength: {
                        value: 2,
                        message: "상품명은 최소 2글자 이상이어야 합니다",
                      },
                    })}
                  />
                  {errors.title && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.title.message}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">상품 설명 *</span>
                  </label>
                  <textarea
                    className={`textarea textarea-bordered h-24 ${
                      errors.description ? "textarea-error" : ""
                    }`}
                    placeholder="상품에 대한 자세한 설명을 입력하세요"
                    {...register("description", {
                      required: "상품 설명을 입력하세요",
                      minLength: {
                        value: 10,
                        message: "설명은 최소 10글자 이상이어야 합니다",
                      },
                    })}
                  ></textarea>
                  {errors.description && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.description.message}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Price and lesson info */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title mb-4">가격 및 레슨 정보</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">총 가격 (원) *</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered ${
                        errors.price ? "input-error" : ""
                      }`}
                      placeholder="0"
                      {...register("price", {
                        required: "가격을 입력하세요",
                        min: {
                          value: 1000,
                          message: "가격은 최소 1,000원 이상이어야 합니다",
                        },
                        valueAsNumber: true,
                      })}
                    />
                    {errors.price && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.price.message}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">총 레슨 횟수 *</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered ${
                        errors.totalCount ? "input-error" : ""
                      }`}
                      placeholder="1"
                      {...register("totalCount", {
                        required: "총 레슨 횟수를 입력하세요",
                        min: {
                          value: 1,
                          message: "최소 1회 이상이어야 합니다",
                        },
                        max: {
                          value: 100,
                          message: "최대 100회까지 설정할 수 있습니다",
                        },
                        valueAsNumber: true,
                      })}
                    />
                    {errors.totalCount && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.totalCount.message}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">레슨 시간 (분) *</span>
                    </label>
                    <select
                      className={`select select-bordered ${
                        errors.time ? "select-error" : ""
                      }`}
                      {...register("time", {
                        required: "레슨 시간을 선택하세요",
                        valueAsNumber: true,
                      })}
                    >
                      <option value={30}>30분</option>
                      <option value={45}>45분</option>
                      <option value={60}>60분</option>
                      <option value={90}>90분</option>
                    </select>
                    {errors.time && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.time.message}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">만료 기간 (일) *</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered ${
                        errors.expiration_period ? "input-error" : ""
                      }`}
                      placeholder="30"
                      {...register("expiration_period", {
                        required: "만료 기간을 입력하세요",
                        min: {
                          value: 7,
                          message: "최소 7일 이상이어야 합니다",
                        },
                        max: {
                          value: 365,
                          message: "최대 365일까지 설정할 수 있습니다",
                        },
                        valueAsNumber: true,
                      })}
                    />
                    {errors.expiration_period && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.expiration_period.message}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text">트레이너 인센티브 (%)</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered ${
                        errors.incentivePercent ? "input-error" : ""
                      }`}
                      placeholder="0"
                      {...register("incentivePercent", {
                        min: {
                          value: 0,
                          message: "인센티브는 0% 이상이어야 합니다",
                        },
                        max: {
                          value: 100,
                          message: "인센티브는 100% 이하여야 합니다",
                        },
                        valueAsNumber: true,
                      })}
                    />
                    {errors.incentivePercent && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {errors.incentivePercent.message}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trainer level selection */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title mb-4">대상 트레이너 레벨 선택</h2>
                <p className="text-sm text-gray-600 mb-4">
                  이 상품을 담당할 수 있는 트레이너들의 레벨을 선택하세요.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {trainerLevelOptions.map((option) => (
                    <div key={option.value} className="form-control">
                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={selectedTrainerLevels.includes(option.value)}
                          onChange={() =>
                            handleTrainerLevelChange(option.value)
                          }
                        />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {selectedTrainerLevels.length === 0 && (
                  <div className="alert alert-warning mt-4">
                    <span>최소 하나의 트레이너 레벨을 선택해주세요.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.back()}
                disabled={isMutating}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isMutating || selectedTrainerLevels.length === 0}
              >
                {isMutating && (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                {isMutating ? "생성 중..." : "PT 상품 생성"}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar - Real-time calculations and preview */}
        <div className="space-y-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">가격 정보</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">레슨당 가격:</span>
                  <span className="font-medium">
                    {calculations.pricePerLesson.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">분당 가격:</span>
                  <span className="font-medium">
                    {calculations.pricePerMinute.toLocaleString()}원
                  </span>
                </div>
                <div className="divider my-2"></div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">총 운동 시간:</span>
                  <span className="font-medium">
                    {calculations.totalHours}시간
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">선택된 레벨</h3>
              {selectedTrainerLevels.length > 0 ? (
                <div className="space-y-2">
                  {selectedTrainerLevels.map((level) => {
                    const option = trainerLevelOptions.find(
                      (opt) => opt.value === level
                    );
                    return (
                      <div key={level} className="badge badge-primary badge-lg">
                        {option?.label}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">선택된 레벨이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
