"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  getTrainersForPtProductSet,
  IPtProductForm,
  ITrainerForSelect,
  newPtProductSubmit,
} from "./actions";
import { useRouter } from "next/navigation";
import TrainerSelector from "@/app/components/trainer/trainerSelector";

const NewPtProduct = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<IPtProductForm>();
  const [trainers, setTrainers] = useState<ITrainerForSelect[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState("");
  const isLimitedTime = watch("isLimitedTime");
  const dateRange = watch("dateRange");
  const isSubmitDisabled =
    isLimitedTime === "true" && (!dateRange?.from || !dateRange?.to);

  const onValid = async (data: IPtProductForm) => {
    setIsSubmitting(true);
    setServerError("");
    try {
      let openedAt: Date, closedAt: Date;
      if (data.isLimitedTime === "true") {
        if (!data.dateRange?.from || !data.dateRange?.to) {
          setError("dateRange", {
            type: "empty",
            message: "날짜를 선택해주세요.",
          });
          return;
        }
        openedAt = data.dateRange.from;
        closedAt = data.dateRange.to;
      } else {
        openedAt = new Date();
        closedAt = new Date("2099-12-31");
      }

      const submissionData = {
        title: data.title,
        description: data.description,
        price: data.price,
        totalCount: data.totalCount,
        onSale: data.onSale,
        openedAt,
        closedAt,
        trainers: data.trainers,
      };

      const result = await newPtProductSubmit(submissionData);
      if (result.ok) {
        router.push(`/manager/product/pt/${result.data.id}`);
      } else {
        if (result.error) {
          setServerError(result.error);
        }
      }
    } catch (error) {
      console.error(error);
      setServerError(
        "알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const initTrainers = async () => {
      const dbTrainers = await getTrainersForPtProductSet();
      setTrainers(dbTrainers);
    };
    initTrainers();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto ">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold mb-2">신규 PT 등록</h1>

          {serverError && (
            <div className="alert alert-error mb-4">
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onValid)} className="space-y-6">
            {/* 기본 정보 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">이름</span>
                  <span className="label-text-alt text-gray-500">
                    PT상품의 이름
                  </span>
                </label>
                <input
                  {...register("title", { required: "이름은 필수입니다" })}
                  type="text"
                  placeholder="PT Light 10"
                  className="input input-bordered w-full"
                />
                {errors.title && (
                  <span className="text-error text-sm mt-1">
                    {errors.title.message}
                  </span>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">가격</span>
                  <span className="label-text-alt text-gray-500">
                    숫자만 입력
                  </span>
                </label>
                <input
                  {...register("price", {
                    required: "가격은 필수입니다",
                    pattern: { value: /^\d+$/, message: "숫자만 입력해주세요" },
                  })}
                  type="number"
                  placeholder="300000"
                  className="input input-bordered w-full"
                />
                {errors.price && (
                  <span className="text-error text-sm mt-1">
                    {errors.price.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">횟수</span>
                  <span className="label-text-alt text-gray-500">
                    PT 프로그램 횟수
                  </span>
                </label>
                <input
                  {...register("totalCount", {
                    required: "횟수는 필수입니다",
                    pattern: { value: /^\d+$/, message: "숫자만 입력해주세요" },
                  })}
                  type="number"
                  placeholder="10"
                  className="input input-bordered w-full"
                />
                {errors.totalCount && (
                  <span className="text-error text-sm mt-1">
                    {errors.totalCount.message}
                  </span>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">세부내용</span>
                  <span className="label-text-alt text-gray-500">
                    상세 설명
                  </span>
                </label>
                <input
                  {...register("description", {
                    required: "세부내용은 필수입니다",
                  })}
                  type="text"
                  placeholder="30분간 진행되는 간결한 PT. 운동 초보자용"
                  className="input input-bordered w-full"
                />
                {errors.description && (
                  <span className="text-error text-sm mt-1">
                    {errors.description.message}
                  </span>
                )}
              </div>
            </div>

            {/* 트레이너 선택 섹션 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">담당 트레이너</span>
                <span className="label-text-alt text-gray-500">
                  중복선택 가능
                </span>
              </label>
              <div className="bg-base-200 p-4 rounded-lg">
                <Controller
                  name="trainers"
                  control={control}
                  defaultValue={trainers}
                  render={({ field }) => (
                    <TrainerSelector
                      trainers={trainers}
                      onTrainerClick={(newTrainers) => {
                        setTrainers(newTrainers);
                        const selectedTrainers = newTrainers.filter(
                          (t) => t.chosen
                        );
                        field.onChange(selectedTrainers);
                      }}
                      isOnly={false}
                      size="S"
                    />
                  )}
                />
              </div>
            </div>

            {/* 판매 기간 섹션 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">판매기간</span>
                <span className="label-text-alt text-gray-500">
                  기간한정 상품 설정
                </span>
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="label cursor-pointer gap-2">
                  <span className="label-text">기간제한없음</span>
                  <input
                    {...register("isLimitedTime")}
                    type="radio"
                    className="radio radio-primary"
                    value="false"
                    defaultChecked
                  />
                </label>
                <label className="label cursor-pointer gap-2">
                  <span className="label-text">기간한정상품</span>
                  <input
                    {...register("isLimitedTime")}
                    type="radio"
                    className="radio radio-primary"
                    value="true"
                  />
                </label>
              </div>
            </div>

            {/* 날짜 선택기 */}
            {isLimitedTime === "true" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    판매 기간 선택
                  </span>
                </label>
                <div className="bg-base-200 p-4 rounded-lg">
                  <Controller
                    name="dateRange"
                    control={control}
                    render={({ field }) => (
                      <DayPicker
                        mode="range"
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={1}
                        className="mx-auto"
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* 판매 상태 섹션 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">판매 상태</span>
                <span className="label-text-alt text-gray-500">
                  이벤트성 상품은 비활성화
                </span>
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="label cursor-pointer gap-2">
                  <span className="label-text text-success">활성화</span>
                  <input
                    {...register("onSale")}
                    type="radio"
                    className="radio radio-success"
                    value="true"
                    defaultChecked
                  />
                </label>
                <label className="label cursor-pointer gap-2">
                  <span className="label-text text-error">비활성화</span>
                  <input
                    {...register("onSale")}
                    type="radio"
                    className="radio radio-error"
                    value="false"
                  />
                </label>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                className={`btn btn-primary btn-lg ${
                  isSubmitting || isSubmitDisabled ? "btn-disabled" : ""
                }`}
                disabled={isSubmitting || isSubmitDisabled}
              >
                {isSubmitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewPtProduct;
