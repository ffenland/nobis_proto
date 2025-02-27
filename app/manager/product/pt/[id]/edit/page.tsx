'use client'

import { useEffect, useState, useRef, use } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { useRouter } from 'next/navigation'
import {
  getPtProduct,
  editPtProductSubmit,
  IPtProductForEdit,
  IPtProductSubmitDataOptional
} from './actions'
import TrainerSelector from '@/app/components/trainer/trainerSelector'
import {
  getTrainersForPtProductSet,
  IPtProductForm,
  ITrainerForSelect
} from '@/app/manager/product/pt/new/actions'

type Params = Promise<{ id: string }>

const EditPtProduct = (props: { params: Params }) => {
  const router = useRouter()
  const params = use(props.params)
  const id = params.id

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    setValue,
    formState: { errors }
  } = useForm<IPtProductForm>()

  const [trainers, setTrainers] = useState<ITrainerForSelect[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState('')

  const prevPtProduct = useRef<IPtProductForEdit | null>(null)
  const isLimitedTime = watch('isLimitedTime')
  const dateRange = watch('dateRange')
  const isSubmitDisabled =
    isLimitedTime === 'true' && (!dateRange?.from || !dateRange?.to)

  const onValid = async (data: IPtProductForm) => {
    setIsSubmitting(true)
    setServerError('')
    if (!prevPtProduct.current) {
      setServerError(
        '기존 PT상품 데이터를 불러오는데 실패했습니다. 새로고침 해주세요.'
      )
      setIsSubmitting(false)
      return
    }

    const prevIsLimitedTime =
      prevPtProduct.current.closedAt !== new Date('2099-12-31')
    let openedAt: Date, closedAt: Date
    if (data.isLimitedTime !== 'true') {
      // 일반상품(기간제한 없는)인 경우
      closedAt = new Date('2099-12-31')
      openedAt =
        prevIsLimitedTime && prevPtProduct.current.openedAt
          ? prevPtProduct.current.openedAt
          : new Date()
    } else {
      // 조건 2: isLimitedTime이 true인 경우
      if (data.dateRange?.from && data.dateRange?.to) {
        openedAt = data.dateRange.from
        closedAt = data.dateRange.to
      } else {
        setError('dateRange', {
          type: 'empty',
          message: '날짜를 선택해주세요.'
        })
        return
      }
    }
    try {
      // 바뀐 데이터가 있는지 체크
      // 기존 값과 비교해서 바뀐 데이터만 전송하자.
      const changedData: IPtProductSubmitDataOptional = {
        ...(data.title !== prevPtProduct.current.title && {
          title: data.title
        }),
        ...(data.description !== prevPtProduct.current.description && {
          description: data.description
        }),
        ...(data.price !== prevPtProduct.current.price && {
          price: Number(data.price)
        }),
        ...(data.totalCount !== prevPtProduct.current.totalCount && {
          totalCount: Number(data.totalCount)
        }),
        ...((data.onSale === 'true') !== prevPtProduct.current.onSale && {
          onSale: data.onSale === 'true'
        }),
        ...(openedAt.getTime() !== prevPtProduct.current.openedAt.getTime() && {
          openedAt
        }),
        ...(closedAt.getTime() !== prevPtProduct.current.closedAt.getTime() && {
          closedAt
        }),
        ...((data.trainers.length !== prevPtProduct.current.trainers.length ||
          !data.trainers.every(t =>
            prevPtProduct.current!.trainers.some(
              ptTrainer => ptTrainer.trainerId === t.trainerId
            )
          ) ||
          !prevPtProduct.current.trainers.every(ptTrainer =>
            data.trainers.some(t => t.trainerId === ptTrainer.trainerId)
          )) && { trainers: data.trainers })
      }
      if (
        Object.keys(changedData).length === 1 &&
        changedData.trainers?.length === 0
      ) {
        // 키 갯수가 1(id)이면 변경된 내용이 없다.
        setServerError('변경된 내용이 없습니다.')
        setIsSubmitting(false)
        return
      }
      console.log(changedData)

      const result = await editPtProductSubmit({
        submitData: changedData,
        ptProductId: id
      })
      if (result.ok) {
        router.push(`/manager/product/pt/${id}`)
      } else {
        if (result.error) {
          setServerError(result.error)
        }
      }
    } catch (error) {
      console.error(error)
      setServerError(
        '알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (!id) return router.push('/manager/product/pt')
      const pt = await getPtProduct(id)
      if (!pt) return router.push('/manager/product/pt')
      prevPtProduct.current = pt
      const dbTrainers = await getTrainersForPtProductSet()
      dbTrainers.forEach(t => {
        t.chosen = pt.trainers.some(
          ptTrainer => ptTrainer.trainerId === t.trainerId
        )
      })
      setTrainers(dbTrainers)
      setValue('title', pt.title)
      setValue('description', pt.description)
      setValue('price', pt.price)
      setValue('totalCount', pt.totalCount)
      setValue('onSale', pt.onSale ? 'true' : 'false')
      setValue(
        'isLimitedTime',
        pt.closedAt.getTime() === new Date('2099-12-31').getTime()
          ? 'false'
          : 'true'
      )
      setValue('dateRange', { from: pt.openedAt, to: pt.closedAt })
    }

    init()
  }, [id, router, setValue])

  return (
    <div className="flex w-full flex-col">
      <span className="mx-auto my-2 text-xl font-bold">PT 상품 수정</span>
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
          <div className="mt-5">
            <Controller
              name="dateRange"
              control={control}
              render={({ field }) => (
                <DayPicker
                  mode="range"
                  selected={field.value}
                  onSelect={field.onChange}
                  numberOfMonths={1}
                />
              )}
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

export default EditPtProduct
