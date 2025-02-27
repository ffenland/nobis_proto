import {
  isValidWeekDayNumberStringMap,
  weekDayNumberStringMap,
  weekdaysNotSun
} from '@/app/lib/constants'
import prisma from '@/app/lib/prisma'
import { z } from 'zod'

const submitNewCenter = async (formData: FormData) => {
  'use server'
  const timeRegex = /^([01]\d|2[0-3])([0-5]\d)$/

  const StoreSchema = z.object({
    title: z.string().min(1, '제목은 필수입니다'),
    address: z.string().min(1, '주소는 필수입니다'),
    phone: z.string().regex(/^\d{10,11}$/, '올바른 전화번호 형식이 아닙니다'),
    description: z.string().optional(),
    MON_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    MON_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    TUE_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    TUE_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    WED_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    WED_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    THU_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    THU_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    FRI_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    FRI_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    SAT_open: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다'),
    SAT_close: z.string().regex(timeRegex, '올바른 시간 형식이 아닙니다')
  })
  const validatedFields = StoreSchema.safeParse({
    title: formData.get('title'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    description: formData.get('description'),
    MON_open: formData.get('MON_open'),
    MON_close: formData.get('MON_close'),
    TUE_open: formData.get('TUE_open'),
    TUE_close: formData.get('TUE_close'),
    WED_open: formData.get('WED_open'),
    WED_close: formData.get('WED_close'),
    THU_open: formData.get('THU_open'),
    THU_close: formData.get('THU_close'),
    FRI_open: formData.get('FRI_open'),
    FRI_close: formData.get('FRI_close'),
    SAT_open: formData.get('SAT_open'),
    SAT_close: formData.get('SAT_close')
  })

  if (!validatedFields.success) {
    return { ok: false, error: validatedFields.error.flatten().fieldErrors }
  }

  // 여기서 검증된 데이터를 사용하여 데이터베이스 작업 등을 수행합니다.
  const storeData = validatedFields.data
  // ... 데이터베이스 저장 로직
  const newCenter = await prisma.fitnessCenter.create({
    data: {
      title: storeData.title,
      address: storeData.address,
      phone: storeData.phone
    }
  })
}

const AddNewCenter = async () => {
  return (
    <div>
      <span className="my-2 text-lg font-bold">신규 센터 등록하기</span>
      <form
        action={submitNewCenter}
        className="flex flex-col gap-3">
        <label className="input input-bordered flex items-center gap-2">
          지점 이름
          <input
            type="text"
            className="grow"
            name="title"
            placeholder="유천점"
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          센터 주소
          <input
            type="text"
            className="grow"
            name="address"
            placeholder="선수촌로 79-19 더퍼스트 2층"
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          전화번호
          <input
            type="text"
            className="grow"
            name="phone"
            placeholder="033-642-9682"
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          설명
          <input
            type="text"
            className="grow"
            name="description"
            placeholder="주차공간 겸비"
          />
        </label>

        <label className="mb-2 flex flex-col gap-2">
          <span>요일별 개점,폐업시간 설정</span>
          {weekdaysNotSun.map((day, index) => {
            const weekKey = index + 1
            if (isValidWeekDayNumberStringMap(weekKey)) {
              return (
                <div
                  key={day}
                  className="flex items-center">
                  <span className="w-20">
                    {weekDayNumberStringMap[weekKey].kor.long}
                  </span>
                  <input
                    type="text"
                    id={`${day}_open`}
                    name={`${day}_open`}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="0900"
                  />
                  <span className="mx-2">-</span>
                  <input
                    type="text"
                    id={`${day}_close`}
                    name={`${day}_close`}
                    className="w-20 rounded border px-3 py-2"
                    placeholder="2200"
                  />
                </div>
              )
            } else {
              return null
            }
          })}
        </label>

        <div className="flex items-center justify-center">
          <button className="btn btn-primary">등록하기</button>
        </div>
      </form>
    </div>
  )
}

export default AddNewCenter
