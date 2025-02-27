'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import {
  getTrainersForPtProductSet,
  IPtProductForm,
  ITrainerForSelect,
  newPtProductSubmit
} from './actions'
import { useRouter } from 'next/navigation'
import TrainerSelector from '@/app/components/trainer/trainerSelector'

const NewPtProduct = () => {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors }
  } = useForm<IPtProductForm>()
  const [trainers, setTrainers] = useState<ITrainerForSelect[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState('')
  const isLimitedTime = watch('isLimitedTime')
  const dateRange = watch('dateRange')
  const isSubmitDisabled =
    isLimitedTime === 'true' && (!dateRange?.from || !dateRange?.to)

  const onValid = async (data: IPtProductForm) => {
    setIsSubmitting(true)
    setServerError('')
    try {
      let openedAt: Date, closedAt: Date
      if (data.isLimitedTime === 'true') {
        // 기간한정 상품의 경우
        if (!data.dateRange?.from || !data.dateRange?.to) {
          // 기간한정 상품인데 날짜정보가 없는 경우.
          setError('dateRange', {
            type: 'empty',
            message: '날짜를 선택해주세요.'
          })
          return
        }
        openedAt = data.dateRange.from
        closedAt = data.dateRange.to
      } else {
        // 기간제한 없이 판매하는 경우
        openedAt = new Date()
        closedAt = new Date('2099-12-31')
      }

      const submissionData = {
        title: data.title,
        description: data.description,
        price: data.price,
        totalCount: data.totalCount,
        onSale: data.onSale,
        openedAt,
        closedAt,
        trainers: data.trainers
      }

      // 서버 액션 호출
      const result = await newPtProductSubmit(submissionData)
      // 결과 처리 로직
      if (result.ok) {
        router.push(`/manager/product/pt/${result.data.id}`)
      } else {
        if (result.error) {
          setServerError(result.error)
        }
      }
    } catch (error) {
      // 에러 처리
      console.error(error)
      console.log(error)
      setServerError(
        '알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    // Get Trainer List and Save
    const initTrainers = async () => {
      const dbTrainers = await getTrainersForPtProductSet()
      setTrainers(dbTrainers)
    }
    initTrainers()
  }, [])
  return (
    <div className="flex w-full flex-col">
      <span className="mx-auto my-2 text-xl font-bold">신규 PT 등록</span>
      {serverError ? <span className="text-red-500">{serverError}</span> : null}
      <form onSubmit={handleSubmit(onValid)}>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">이름</span>
            <span className="label-text-alt">PT상품의 이름을 적어주세요.</span>
          </div>
          <input
            {...register('title', { required: '이름은 필수입니다' })}
            type="text"
            placeholder="PT Ligth 10"
            className="input input-bordered w-full"
          />
          {errors.title && (
            <span className="text-red-500">{errors.title.message}</span>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">가격</span>
            <span className="label-text-alt">가격을 숫자로 적어주세요.</span>
          </div>
          <input
            {...register('price', {
              required: '가격은 필수입니다',
              pattern: { value: /^\d+$/, message: '숫자만 입력해주세요' }
            })}
            type="number"
            placeholder="300000"
            className="input input-bordered w-full"
          />
          {errors.price && (
            <span className="text-red-500">{errors.price.message}</span>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">횟수</span>
            <span className="label-text-alt">
              PT프로그램 횟수를 숫자로 넣어주세요.
            </span>
          </div>
          <input
            {...register('totalCount', {
              required: '일수는 필수입니다',
              pattern: { value: /^\d+$/, message: '숫자만 입력해주세요' }
            })}
            type="number"
            placeholder="10"
            className="input input-bordered w-full"
          />
          {errors.totalCount && (
            <span className="text-red-500">{errors.totalCount.message}</span>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">세부내용</span>
            <span className="label-text-alt">기타사항</span>
          </div>
          <input
            {...register('description', { required: '세부내용은 필수입니다' })}
            type="text"
            placeholder="30분간 진행되는 간결한 PT. 운동 초보자용"
            className="input input-bordered w-full"
          />
          {errors.description && (
            <span className="text-red-500">{errors.description.message}</span>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">담당 트레이너</span>
            <span className="label-text-alt">중복선택 가능</span>
          </div>

          <Controller
            name="trainers"
            control={control}
            defaultValue={trainers}
            render={({ field }) => (
              <TrainerSelector
                trainers={trainers}
                onTrainerClick={newTrainers => {
                  setTrainers(newTrainers)
                  const selectedTrainers = newTrainers.filter(t => t.chosen)
                  field.onChange(selectedTrainers)
                }}
                isOnly={false}
                size="S"
              />
            )}
          />
        </label>
        <label className="mt-5 flex flex-col">
          <div className="label">
            <span className="label-text">판매기간</span>
            <span className="label-text-alt">
              기간한정 상품은 날짜를 정해주세요
            </span>
          </div>
          <div className="RADIO flex gap-5">
            <div className="form-control">
              <label className="label flex cursor-pointer items-center gap-2">
                <span className="label-text">기간제한없음</span>
                <input
                  {...register('isLimitedTime')}
                  type="radio"
                  className="radio"
                  value="false"
                  defaultChecked
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label flex cursor-pointer items-center gap-2">
                <span className="label-text">기간한정상품</span>
                <input
                  {...register('isLimitedTime')}
                  type="radio"
                  className="radio"
                  value="true"
                />
              </label>
            </div>
          </div>
        </label>
        {isLimitedTime === 'true' && (
          <div className="mt-5 w-full">
            <Controller
              name="dateRange"
              control={control}
              render={({ field }) => {
                return (
                  <DayPicker
                    mode="range"
                    selected={field.value}
                    onSelect={field.onChange}
                    numberOfMonths={1}
                  />
                )
              }}
            />
          </div>
        )}
        <div className="mt-5 flex flex-col">
          <span className="text-sm">
            이벤트성 한정 상품의 경우 바로 판매되지 않게 비활성화 해주세요.
          </span>
          <div className="RADIO flex gap-5">
            <div className="form-control">
              <label className="label flex cursor-pointer items-center gap-2">
                <span className="label-text text-green-500">활성화</span>
                <input
                  {...register('onSale')}
                  type="radio"
                  className="radio checked:bg-green-500"
                  value="true"
                  defaultChecked
                />
              </label>
            </div>
            <div className="form-control">
              <label className="label flex cursor-pointer items-center gap-2">
                <span className="label-text text-red-500">비활성화</span>
                <input
                  {...register('onSale')}
                  type="radio"
                  className="radio checked:bg-red-500"
                  value="false"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="submit"
            className={`btn ${
              isSubmitting || isSubmitDisabled ? 'btn-disabled' : 'btn-primary'
            }`}
            disabled={isSubmitting || isSubmitDisabled}>
            {isSubmitting ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewPtProduct
