'use client'

import React, { useState, useEffect, use, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css' // 서버 액션 import 가정
import { useRouter } from 'next/navigation'
import { INewMembershipData } from '@/app/manager/product/membership/new/actions'
import {
  getMembershipProduct,
  IMembershipProductForEdit,
  IMembershipProductSubmitDataOptional,
  updateMembershipProduct
} from './actions'

type Params = Promise<{ id: string }>

const EditMembershipProduct = (props: { params: Params }) => {
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
  } = useForm<INewMembershipData>()
  const prevMembershipProduct = useRef<IMembershipProductForEdit>()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState('')
  const isLimitedTime = watch('isLimitedTime')
  const dateRange = watch('dateRange')
  const isSubmitDisabled =
    isLimitedTime === 'true' && (!dateRange?.from || !dateRange?.to)

  const onValid = async (data: INewMembershipData) => {
    setIsSubmitting(true)
    setServerError('')
    if (!prevMembershipProduct.current) {
      setServerError(
        '상품 정보를 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.'
      )
      setIsSubmitting(false)
      return
    }
    const prevIsLimitedTime =
      prevMembershipProduct.current.closedAt !== new Date('2099-12-31')
    let openedAt: Date, closedAt: Date
    if (data.isLimitedTime !== 'true') {
      // 일반상품(기간제한 없는)인 경우
      closedAt = new Date('2099-12-31')
      openedAt =
        prevIsLimitedTime && prevMembershipProduct.current.openedAt
          ? prevMembershipProduct.current.openedAt
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
      const changedData: IMembershipProductSubmitDataOptional = {
        ...(data.title !== prevMembershipProduct.current.title && {
          title: data.title
        }),
        ...(data.price !== prevMembershipProduct.current.price && {
          price: Number(data.price)
        }),
        ...(data.totalCount !== prevMembershipProduct.current.totalCount && {
          totalCount: Number(data.totalCount)
        }),
        ...(data.description !== prevMembershipProduct.current.description && {
          description: data.description
        }),
        ...((data.onSale === 'true') !==
          prevMembershipProduct.current.onSale && {
          onSale: data.onSale === 'true'
        }),
        ...(openedAt.getTime() !==
          prevMembershipProduct.current.openedAt.getTime() && { openedAt }),
        ...(closedAt.getTime() !==
          prevMembershipProduct.current.closedAt.getTime() && { closedAt })
      }
      if (Object.keys(changedData).length === 1) {
        // 키 갯수가 1(id)이면 변경된 내용이 없다.
        setServerError('변경된 내용이 없습니다.')
        setIsSubmitting(false)
        return
      }

      // 서버 액션 호출
      const result = await updateMembershipProduct({
        prevMembershipProductId: id,
        submitData: changedData
      })
      // 결과 처리 로직
      if (result.ok) {
        router.push(`/manager/product/membership/${result.data.id}`)
      } else {
        if (result.error) {
          setServerError(result.error)
        }
      }
    } catch (error) {
      // 에러 처리

      setServerError(
        '알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해주세요.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  useEffect(() => {
    const init = async () => {
      if (!id) return router.push('/manager/product/membership')
      const membershipProduct = await getMembershipProduct(id)
      if (!membershipProduct) return router.push('/manager/product/membership')
      prevMembershipProduct.current = membershipProduct
      setValue('title', membershipProduct.title)
      setValue('price', membershipProduct.price)
      setValue('totalCount', membershipProduct.totalCount)
      setValue('description', membershipProduct.description)
      setValue('onSale', membershipProduct.onSale ? 'true' : 'false')
      setValue(
        'isLimitedTime',
        membershipProduct.closedAt.getTime() ===
          new Date('2099-12-31').getTime()
          ? 'false'
          : 'true'
      )
      setValue('dateRange', {
        from: membershipProduct.openedAt,
        to: membershipProduct.closedAt
      })
    }
    init()
  }, [id, router, setValue])

  return (
    <div className="flex w-full flex-col">
      <span className="mx-auto my-2 text-xl font-bold">회원권 상품 수정</span>
      {serverError ? <span className="text-red-500">{serverError}</span> : null}
      <form onSubmit={handleSubmit(onValid)}>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">이름</span>
            <span className="label-text-alt">회원권의 이름을 적어주세요.</span>
          </div>
          <input
            {...register('title', { required: '이름은 필수입니다' })}
            type="text"
            placeholder="주중 100일 회원권"
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
            placeholder="100000"
            className="input input-bordered w-full"
          />
          {errors.price && (
            <span className="text-red-500">{errors.price.message}</span>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">일수</span>
            <span className="label-text-alt">
              회원권 이용가능 일수를 숫자로 넣어주세요.
            </span>
          </div>
          <input
            {...register('totalCount', {
              required: '일수는 필수입니다',
              pattern: { value: /^\d+$/, message: '숫자만 입력해주세요' }
            })}
            type="number"
            placeholder="100"
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
            placeholder="월~목 주중에만 사용가능한 100일권입니다."
            className="input input-bordered w-full"
          />
          {errors.description && (
            <span className="text-red-500">{errors.description.message}</span>
          )}
        </label>

        <div className="mt-5 flex flex-col">
          <span className="text-sm">기간 설정</span>
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
        </div>

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
            이벤트성 상품의 경우 바로 판매되지 않게 비활성화 해주세요.
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

export default EditMembershipProduct
