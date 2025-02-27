import { Controller, useForm } from 'react-hook-form'
import TrainerSelector, { ITrainer } from '@/app/components/trainer/trainerSelector'
import { DayPicker, type DateRange } from 'react-day-picker'
import { useEffect, useRef, useState } from 'react'
import { getPtProduct, IEditPtProduct } from './actions'
import { useRouter } from 'next/navigation'
import { getAllTrainers, ITrainer } from '@/app/lib/SA_trainers'

export interface IAddPTData {
  title: string
  price: number
  totalCount: number
  description: string
  onSale: string
  isLimitedTime: string
  dateRange: DateRange | undefined
  trainers: ITrainer[]
  time?: number
}

const AddOrEditPtProduct = ({ ptProductId }: { ptProductId?: string }) => {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    setValue,
    formState: { errors }
  } = useForm<IAddPTData>()

  const [serverError, setServerError] = useState('')
    const [trainers, setTrainers] = useState<
      { id: string; username: string; chosen: boolean }[]
    >([])
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  
    const prevData = useRef<IEditPtProduct>()
  
    const isLimitedTime = watch('isLimitedTime')
    const dateRange = watch('dateRange')
  
    const isSubmitDisabled =
      isLimitedTime === 'true' && (!dateRange?.from || !dateRange?.to)

    const onValid = async (data: IAddPTData) => {
      setIsSubmitting(true)
    setServerError('')
    try {
      let startDate: Date, endDate: Date

      if (data.isLimitedTime === 'true') {
        if (!data.dateRange?.from || !data.dateRange?.to) {
          setError('dateRange', {
            type: 'empty',
            message: '날짜를 선택해주세요.'
          })
          return
        }
        startDate = data.dateRange.from
        endDate = data.dateRange.to
      } else {
        startDate = new Date()
        endDate = new Date('2099-12-31')
      }
    } catch (error) {
      
    }
    }
    useEffect(()=>{
      const allTrainers:I = await getAllTrainers()
      if (ptProductId){
        // 기존 PT상품 수정
        const getPrevData = async ()=>{
          const prevPtProduct = await getPtProduct(ptProductId)
          if (!prevPtProduct){
            router.push('/manager/pt')
          } else {
            prevData.current = prevPtProduct;
            setValue('title', prevPtProduct.title);
            setValue('price', prevPtProduct.price);
            setValue('totalCount', prevPtProduct.totalCount);
            setValue('description', prevPtProduct.description);
            setValue('onSale', prevPtProduct.onSale ? 'true' : 'false');    
            setValue('isLimitedTime', prevPtProduct.openedAt ? 'true' : 'false');

            if (prevPtProduct.openedAt && prevPtProduct.closedAt){
              setValue('dateRange', {
                from: new Date(prevPtProduct.openedAt),
                to: new Date(prevPtProduct.closedAt)
              })
            }
            const selectedTrainers = 

          }
        }
      }else {
        // 새로운 PT상품 추가
      }
    },[ptProductId])
  
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="TITLE">
        <span>{ptProductId ? 'PT상품 수정' : 'PT상품 추가'}</span>
      </div>
      <div className="ERROR">
        <span className="text-red-500"> {serverError}</span>
      </div>
      <form onSubmit={handleSubmit(onValid)}>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">이름</span>
            <span className="label-text-alt">PT상품의 이름을 입력해 주세요.</span>
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


export default AddOrEditPtProduct;