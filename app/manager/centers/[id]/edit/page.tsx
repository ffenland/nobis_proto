"use client";
import {
  isValidWeekDayNumberStringMap,
  weekDayNumberStringMap,
  weekdaysEnum,
} from "@/app/lib/constants";
import { useForm } from "react-hook-form";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getTrainers,
  ICenterForm,
  ICenterFormData,
  ITrainerForSelect,
  IWeekOpenClose,
} from "../../new/actions";
import { getCenterInfo, ICenterInfo, updateCenter } from "./actions";

type Params = Promise<{ id: string }>;

const EditCenter = (props: { params: Params }) => {
  const router = useRouter();
  const params = use(props.params);
  const id = params.id;
  const [trainers, setTrainers] = useState<ITrainerForSelect[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState("");
  const centerRef = useRef<ICenterInfo>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,

    formState: { errors },
  } = useForm<ICenterForm>();

  const formValues = watch();

  const changedFields = useMemo(() => {
    if (!centerRef.current) return {};

    const changes: Partial<ICenterFormData> = {};

    // 기본 정보 확인
    if (centerRef.current.title !== formValues.title) {
      changes.title = formValues.title;
    }
    if (centerRef.current.address !== formValues.address) {
      changes.address = formValues.address;
    }
    if (centerRef.current.phone !== formValues.phone) {
      changes.phone = formValues.phone;
    }
    if (centerRef.current.description !== formValues.description) {
      changes.description = formValues.description;
    }

    // 영업 시간 확인
    centerRef.current.openingHours.forEach((day) => {
      const openKey = `${day.dayOfWeek}_open` as keyof IWeekOpenClose;
      const closeKey = `${day.dayOfWeek}_close` as keyof IWeekOpenClose;
      if (
        String(day.openTime) !== formValues[openKey] ||
        String(day.closeTime) !== formValues[closeKey]
      ) {
        changes[openKey] = formValues[openKey];
        changes[closeKey] = formValues[closeKey];
      }
    });

    // 트레이너 확인
    const currentTrainerIds = new Set(
      centerRef.current.trainers.map((t) => t.id)
    );
    const formTrainerIds = new Set(formValues.trainers || []);
    if (
      currentTrainerIds.size !== formTrainerIds.size ||
      ![...currentTrainerIds].every((id) => formTrainerIds.has(id))
    ) {
      changes.trainers = formValues.trainers || [];
    }

    return changes;
  }, [formValues, centerRef]);

  // 변경 사항이 있는지 확인
  const isFormChanged = Object.keys(changedFields).length > 0;

  const onValid = async (data: ICenterForm) => {
    if (centerRef.current === null) return;
    if (isSubmitting === true) return;
    if (!isFormChanged) return;
    setIsSubmitting(true);
    setServerError("");
    // 변경내용을 그룹화 하자.
    const basicFields = {
      ...(changedFields.title && { title: changedFields.title }),
      ...(changedFields.address && { address: changedFields.address }),
      ...(changedFields.phone && { phone: changedFields.phone }),
      ...(changedFields.description && {
        description: changedFields.description,
      }),
    };
    const trainerFields = {
      ...(changedFields.trainers !== undefined && {
        trainers: {
          set: Array.isArray(changedFields.trainers)
            ? changedFields.trainers.map((trainerId) => ({
                id: trainerId,
              }))
            : [{ id: changedFields.trainers }],
        },
      }),
    };
    const opeingHoursFields = centerRef.current.openingHours
      .map((day) => {
        const openKey = `${day.dayOfWeek}_open` as keyof IWeekOpenClose;
        const closeKey = `${day.dayOfWeek}_close` as keyof IWeekOpenClose;
        if (changedFields[openKey] || changedFields[closeKey]) {
          return {
            dayOfWeek: day.dayOfWeek,
            openTime: changedFields[openKey]
              ? changedFields[openKey]
              : String(
                  centerRef.current?.openingHours.find(
                    (d) => d.dayOfWeek === day.dayOfWeek
                  )?.openTime
                ) ?? "900", // 설마 없겠냐
            closeTime: changedFields[closeKey]
              ? changedFields[closeKey]
              : String(
                  centerRef.current?.openingHours.find(
                    (d) => d.dayOfWeek === day.dayOfWeek
                  )?.closeTime
                ) ?? "2200",
          };
        }
      })
      .filter((day) => day !== undefined);

    const openingHoursRemain: string[] = [];
    centerRef.current.openingHours.forEach((day) => {
      const openKey = `${day.dayOfWeek}_open` as keyof IWeekOpenClose;
      const closeKey = `${day.dayOfWeek}_close` as keyof IWeekOpenClose;
      if (!changedFields[openKey] && !changedFields[closeKey]) {
        openingHoursRemain.push(day.id);
      }
    });
    const result = await updateCenter({
      basicFields,
      trainerFields,
      opeingHoursFields,
      openingHoursRemain,
      centerId: id,
    });
    if (result && result.ok) {
      router.push(`/manager/centers/${id}`);
    } else {
      setServerError(
        typeof result.data === "string"
          ? result.data
          : "서버에러가 발생했습니다."
      );
    }

    setIsSubmitting(false);
  };

  const timeParadox =
    parseInt(formValues.MON_close) - 100 < parseInt(formValues.MON_open) ||
    parseInt(formValues.TUE_close) - 100 < parseInt(formValues.TUE_open) ||
    parseInt(formValues.WED_close) - 100 < parseInt(formValues.WED_open) ||
    parseInt(formValues.THU_close) - 100 < parseInt(formValues.THU_open) ||
    parseInt(formValues.FRI_close) - 100 < parseInt(formValues.FRI_open) ||
    parseInt(formValues.SAT_close) - 100 < parseInt(formValues.SAT_open);

  useEffect(() => {
    // Get Trainer List and Save
    const init = async () => {
      const centerInfo = await getCenterInfo(id);
      if (!centerInfo) {
        router.push("/manager/centers");
      } else {
        centerRef.current = centerInfo;
        setValue("title", centerInfo.title);
        setValue("address", centerInfo.address);
        setValue("phone", centerInfo.phone);
        setValue("description", centerInfo.description);
        if (centerInfo.trainers.length > 0) {
          setValue(
            "trainers",
            centerInfo.trainers.map((t) => t.id),
            { shouldDirty: true }
          );
        }
        centerInfo.openingHours.forEach((hour) => {
          setValue(
            `${hour.dayOfWeek}_open` as keyof ICenterForm,
            String(hour.openTime)
          );
          setValue(
            `${hour.dayOfWeek}_close` as keyof ICenterForm,
            String(hour.closeTime)
          );
        });
        const dbTrainers = await getTrainers();
        setTrainers(dbTrainers);
      }
    };
    init();
  }, [router, id, setValue]);
  return (
    <div>
      <span className="my-2 text-lg font-bold">센터 수정</span>
      {serverError && <span className="text-red-700">{serverError}</span>}
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
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
                    <div className="flex flex-col px-4 py-2 border border-gray-200  text-gray-600 rounded-lg peer-checked:bg-blue-800 peer-checked:text-white hover:bg-blue-500 hover:text-white">
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
          <span>시간,분을 숫자로 표시해주세요. 14시20분 =&gt; 1420</span>
          <span>운영하지 않는 요일은 개점,폐점시간에 000을 넣어주세요.</span>
          {timeParadox && (
            <span className="text-red-700">
              폐점시간은 최소한 개점시간 한시간 후가 되어야 합니다.
            </span>
          )}
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
                    {...register(`${enumSet.enum}_open` as keyof ICenterForm, {
                      pattern: {
                        value: /^[0-9]+$/,
                        message: "숫자만 입력해주세요.",
                      },
                    })}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="0900"
                    maxLength={4}
                    minLength={3}
                    pattern="[0-9]{3,4}"
                    inputMode="numeric"
                    title="4자리 숫자로 입력해주세요"
                    required
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
                        "Meta", // Command 키 (Mac)
                        "Control", // Control 키
                        "Alt", // Alt/Option 키
                        "Shift", // Shift 키
                      ];
                      // Function 키 (F1-F12) 추가
                      for (let i = 1; i <= 12; i++) {
                        allowedKeys.push(`F${i}`);
                      }

                      // 숫자 키 확인
                      const isNumericInput = /^[0-9]$/.test(event.key);

                      // Ctrl+A, Command+A 확인
                      const isSelectAll =
                        (event.key === "a" || event.key === "A") &&
                        (event.ctrlKey || event.metaKey);

                      // Command+R 확인
                      const isReload =
                        (event.key === "r" || event.key === "R") &&
                        event.metaKey;

                      // 허용되지 않는 키 입력 방지
                      if (
                        !isNumericInput &&
                        !allowedKeys.includes(event.key) &&
                        !isSelectAll &&
                        !isReload
                      ) {
                        event.preventDefault();
                      }
                    }}
                    onCompositionEnd={(event) => {
                      if (event.target instanceof HTMLInputElement) {
                        event.target.value = event.target.value.replace(
                          /[^0-9]/g,
                          ""
                        );
                      }
                    }}
                  />
                  <span className="mx-2">-</span>
                  <input
                    type="text"
                    {...register(`${enumSet.enum}_close` as keyof ICenterForm, {
                      pattern: {
                        value: /^[0-9]+$/,
                        message: "숫자만 입력해주세요.",
                      },
                    })}
                    id={`${enumSet.enum}_close`}
                    name={`${enumSet.enum}_close`}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="2200"
                    maxLength={4}
                    minLength={3}
                    pattern="[0-9]{3,4}"
                    inputMode="numeric"
                    required
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
                        event.target.value = event.target.value.replace(
                          /[^0-9]/g,
                          ""
                        );
                      }
                    }}
                    onBlur={(event) => {
                      const value = event.target.value;
                      const numValue = parseInt(value);
                      if (numValue > 2400) {
                        event.target.value = "2400";
                        // React Hook Form의 값도 업데이트
                        setValue(
                          `${enumSet.enum}_close` as keyof ICenterForm,
                          "2400"
                        );
                      }
                    }}
                  />
                </div>
              );
            } else {
              return null;
            }
          })}
        </label>

        <div className="flex items-center justify-center">
          <button className="btn btn-primary" disabled={!isFormChanged}>
            수정하기
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCenter;
