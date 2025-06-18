"use client";
import {
  isValidWeekDayNumberStringMap,
  weekDayNumberStringMap,
  weekdaysEnum,
} from "@/app/lib/constants";
import {
  getTrainers,
  ICenterForm,
  ICenterFormData,
  ITrainerForSelect,
  IWeekOpenClose,
  submitNewCenter,
} from "./actions";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AddNewCenter = () => {
  const router = useRouter();
  const [trainers, setTrainers] = useState<ITrainerForSelect[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<ICenterForm>({
    defaultValues: {
      MON_open: "0900",
      MON_close: "2200",
      TUE_open: "0900",
      TUE_close: "2200",
      WED_open: "0900",
      WED_close: "2200",
      THU_open: "0900",
      THU_close: "2200",
      FRI_open: "0900",
      FRI_close: "2200",
      SAT_open: "0900",
      SAT_close: "1300",
    },
  });

  const onSubmit = async (data: ICenterForm) => {
    setIsSubmitting(true);
    setServerError("");

    const formData: ICenterFormData = {
      ...data,
      trainers: Array.isArray(data.trainers) ? data.trainers : [],
    };

    try {
      const result = await submitNewCenter(formData);

      if (!result.ok) {
        throw new Error(result.message);
      }

      router.push(`/manager/centers/${result.data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      setServerError("헬스장 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Get Trainer List and Save
    const initTrainers = async () => {
      const dbTrainers = await getTrainers();
      setTrainers(dbTrainers);
    };
    initTrainers();
  }, []);
  return (
    <div>
      <span className="my-2 text-lg font-bold">신규 센터 등록하기</span>
      {serverError && <span className="text-red-700">{serverError}</span>}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="input input-bordered flex items-center gap-2">
          지점 이름
          <input
            type="text"
            className="grow"
            placeholder="유천점"
            required
            {...register("title")}
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          센터 주소
          <input
            type="text"
            className="grow"
            {...register("address")}
            placeholder="선수촌로 79-19 더퍼스트 2층"
            required
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          전화번호
          <input
            type="text"
            className="grow"
            {...register("phone", {
              pattern: {
                value: /^[0-9]+$/,
                message: "숫자만 입력해주세요.",
              },
            })}
            onKeyDown={(event) => {
              // 허용할 키 목록
              const allowedKeys = [
                "Backspace",
                "Delete",
                "Tab",
                "Escape",
                "Enter",
                "Home",
                "End",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
              ];

              // 숫자 키 확인
              const isNumericInput = /^[0-9]$/.test(event.key);

              // Ctrl+A, Command+A 확인
              const isSelectAll =
                (event.key === "a" || event.key === "A") &&
                (event.ctrlKey || event.metaKey);

              // 허용되지 않는 키 입력 방지
              if (
                !isNumericInput &&
                !allowedKeys.includes(event.key) &&
                !isSelectAll
              ) {
                event.preventDefault();
              }
            }}
            onCompositionEnd={(event) => {
              if (event.target instanceof HTMLInputElement) {
                event.target.value = event.target.value.replace(/[^0-9]/g, "");
              }
            }}
            placeholder="0336429682 숫자만 입력해주세요."
            required
            pattern="[0-9]+"
            inputMode="numeric"
            title="숫자만 입력해주세요."
            maxLength={11}
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          설명
          <input
            type="text"
            className="grow"
            {...register("description")}
            placeholder="주차공간 겸비"
          />
        </label>
        <div>
          <span>소속 트레이너 선택</span>
          <div className="flex flex-wrap gap-2">
            {trainers.length > 0 &&
              trainers.map((trainer) => {
                return (
                  <label
                    key={trainer.trainerId}
                    className="cursor-pointer text-sm font-medium text-center"
                  >
                    <input
                      type="checkbox"
                      {...register("trainers")}
                      value={trainer.trainerId}
                      className="hidden peer"
                    />
                    <div className="flex flex-col px-4 py-2   text-gray-600 rounded-lg peer-checked:bg-blue-800 peer-checked:text-white hover:bg-blue-500 hover:text-white">
                      <span>{trainer.username}</span>
                      <span>
                        {trainer.centerId
                          ? trainer.centerName
                          : "소속 센터 없음"}
                      </span>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>

        <label className="mb-2 flex flex-col gap-2">
          <span>요일별 개점,폐업시간 설정</span>
          <span>운영하지 않는 요일은 개점,폐점시간에 0000을 넣어주세요.</span>
          {weekdaysEnum.map((enumSet, index) => {
            if (enumSet.key === 0) return null;
            const weekKey = index;
            if (isValidWeekDayNumberStringMap(weekKey)) {
              return (
                <div key={enumSet.enum} className="flex items-center">
                  <span className="w-20">
                    {weekDayNumberStringMap[weekKey].kor.long}
                  </span>
                  <input
                    type="text"
                    {...register(
                      `${enumSet.enum}_open` as keyof IWeekOpenClose
                    )}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="0900"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    inputMode="numeric"
                    title="4자리 숫자로 입력해주세요"
                    required
                  />
                  <span className="mx-2">-</span>
                  <input
                    type="text"
                    {...register(
                      `${enumSet.enum}_close` as keyof IWeekOpenClose
                    )}
                    id={`${enumSet.enum}_close`}
                    name={`${enumSet.enum}_close`}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="2200"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    inputMode="numeric"
                    title="4자리 숫자로 입력해주세요"
                    required
                  />
                </div>
              );
            } else {
              return null;
            }
          })}
        </label>

        <div className="flex items-center justify-center">
          <button className="btn btn-primary">등록하기</button>
        </div>
      </form>
    </div>
  );
};

export default AddNewCenter;
