/**
 *
 * @param digit 원하는 자릿수
 * @returns 자릿수 만큼의 랜덤 숫자로 구성된 문자열
 */
export const createRandomNumber = (digit: number) => {
  // 자릿수를 받으면 해당 자릿수만큼의 랜덤한 숫자배열의 문자열을 만들어준다.
  if (digit < 0) {
    return '0'
  }
  let result = ''
  for (let i = 0; i < digit; i++) {
    result += Math.floor(Math.random() * 10)
  }
  return result
}

export const formatNumberStringWithCommas = (numString: string): string => {
  // 입력이 빈 문자열이거나 숫자가 아닌 경우 처리
  if (!numString || isNaN(Number(numString))) {
    return '0'
  }

  // 소수점 처리
  const parts = numString.split('.')
  let integerPart = parts[0]
  const decimalPart = parts.length > 1 ? '.' + parts[1] : ''

  // 정수 부분에 컴마 추가
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  // 정수 부분과 소수 부분 합치기
  return integerPart + decimalPart
}

export const formatNumberWithCommas = (num: number): string => {
  // 숫자를 문자열로 변환하고 소수점 이하를 제거
  const numStr = Math.floor(num).toString()

  // 정규표현식을 사용하여 3자리마다 콤마 추가
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // getMonth()는 0부터 시작하므로 1을 더합니다.
  const day = date.getDate()

  return `${year}년 ${month}월 ${day}일`
}

export const isPastCheck = (inputDate: Date): boolean => {
  const currentDate = () => new Date()

  // 시간을 0으로 설정
  return inputDate.setHours(0, 0, 0, 0) <= currentDate().setHours(0, 0, 0, 0)
}

export const checkOnSale = ({
  openedAt,
  closedAt,
  onSale
}: {
  openedAt: Date
  closedAt: Date
  onSale: boolean
}) => {
  const getCurrentDate = () => new Date()
  const currentDate = getCurrentDate()

  return onSale && currentDate >= openedAt && currentDate <= closedAt
}

export const showRemainDays = (closedAt: Date) => {
  const getCurrentDate = () => new Date()
  const currentDate = getCurrentDate()
  // 두 날짜의 차이를 밀리초로 계산
  const diffTime = closedAt.getTime() - currentDate.getTime()

  // 밀리초를 일수로 변환
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 1) {
    return `${diffDays}일 전`
  } else if (diffDays === 1) {
    return '오늘까지'
  } else {
    return '만료됨'
  }
}

export const formatDateUnitlMinitue = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`
}

export const calculateRemainingCount = ({
  totalCount,
  startedAt
}: {
  totalCount: number
  startedAt: Date | null
}): number => {
  if (!startedAt) {
    return totalCount
  }
  const getToday = () => new Date()
  const today = getToday()

  // 년, 월, 일만 비교하기 위해 시간을 00:00:00으로 설정
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(startedAt)
  startDate.setHours(0, 0, 0, 0)

  if (startDate > today) {
    // startedAt이 현재 날짜보다 미래인 경우
    return totalCount
  } else {
    // startedAt이 현재 날짜보다 과거인 경우
    const diffTime = Math.abs(today.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // totalCount에서 경과 일수를 뺀 값을 반환 (최소값은 0)
    return Math.max(totalCount - diffDays, 0)
  }
}

// handle schedule time

export const formatTimeToString = (h: number, m: number): string =>
  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

export const getHalfHourCount = (startAt: string, endAt: string) => {
  const [startHour, startMinute] = startAt.split(':').map(Number)
  const [endHour, endMinute] = endAt.split(':').map(Number)
  const startTotalMinutes = startHour * 60 + startMinute
  const endTotalMinutes = endHour * 60 + endMinute
  const differenceInMinutes = endTotalMinutes - startTotalMinutes

  return differenceInMinutes / 30
}

export const getStartEndTime = (
  timeArray: number[]
): { startAt: number; endAt: number } => {
  const startAt = timeArray.sort((a, b) => a - b)[0] // 가장 작은 값
  const maxTime = timeArray.sort((a, b) => a - b).reverse()[0] // 가장 큰 값
  // 종료 시간 계산 (가장 큰 값에 30분 추가)
  const endAt = addThirtyMinutes(maxTime)
  return { startAt, endAt }
}

export const addThirtyMinutesString = (time: string): string => {
  // time = "HH:mm" 형식으로 들어옴
  let [currentHour, currentMinute] = time.split(':').map(Number)

  currentMinute += 30
  if (currentMinute === 60) {
    currentMinute = 0
    currentHour++
  }
  if (currentHour === 24) {
    currentHour = 0
  }

  const formattedHour = currentHour.toString().padStart(2, '0')
  const formattedMinute = currentMinute.toString().padStart(2, '0')

  return `${formattedHour}:${formattedMinute}`
}

export const addThirtyMinutes = (time: number): number => {
  let currentHour = Math.floor(time / 100)
  let currentMinute = time % 100
  currentMinute += 30
  if (currentMinute === 60) {
    currentMinute = 0
    currentHour++
  }
  if (currentHour === 24) {
    currentHour = 0
  }
  return currentHour * 100 + currentMinute
}

export const displayTime = (time: number) => {
  const hour = Math.floor(time / 100)
  const minute = time % 100
  return `${hour.toString()}:${minute.toString().padStart(2, '0')}`
}

export const deepEqual = (obj1: any, obj2: any): boolean => {
  // 기본 타입이거나 null인 경우 직접 비교
  if (obj1 === obj2) return true

  // null 체크 (한 쪽만 null인 경우)
  if (obj1 === null || obj2 === null) return false

  // 타입이 다른 경우
  if (typeof obj1 !== typeof obj2) return false

  // 배열인 경우
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    return obj1.every((val, index) => deepEqual(val, obj2[index]))
  }

  // 객체인 경우
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    return keys1.every(
      key => obj2.hasOwnProperty(key) && deepEqual(obj1[key], obj2[key])
    )
  }

  // 그 외의 경우 (함수, Symbol 등)
  return false
}

// KST => UTC
export const convertKSTtoUTC = (date: Date): Date => {
  return new Date(date.setHours(date.getHours() - 9))
}
