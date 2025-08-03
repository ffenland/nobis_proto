# 미사용 파일 목록 (안전하게 제거 가능)

## 1. 테스트 디렉토리 (이미 tsconfig에서 제외)
- `/app/(test)/**` - 테스트용 디렉토리
- `/app/**/test/**` - 각 컴포넌트의 test 디렉토리

## 2. 미사용 Member API
확인 결과 사용되지 않는 것으로 보이는 API:
- `/app/api/member/info/route.ts` - info 엔드포인트는 chat에서만 사용
- `/app/api/member/pt-stats/route.ts`
- `/app/api/member/pt-summary/route.ts`
- `/app/api/member/recent-records/route.ts`
- `/app/api/member/time-slots/route.ts`
- `/app/api/member/validate-schedule/route.ts`

## 3. 빌드 에러에서 확인된 누락된 함수들
trainer.service에서 export되지 않은 함수들을 사용하는 API:
- `/app/api/trainer/working-hours/[id]/route.ts`
- `/app/api/trainer/working-hours/day/[dayOfWeek]/route.ts`
- `/app/api/trainer/working-hours/route.ts`

이 파일들은 사용중이지만 서비스 함수가 구현되지 않았거나 export되지 않음.

## 4. 제거 전 추가 확인 필요
- Member의 membership 관련 페이지들 - 탭바에 없지만 profile에서 링크될 가능성
- payment 관련 페이지들 - 결제 프로세스에서 사용될 가능성

## 권장 처리 방법

### 1단계: 안전한 제거
1. 테스트 디렉토리는 이미 tsconfig에서 제외됨
2. 미사용 Member API 중 확실한 것들 제거

### 2단계: 서비스 함수 복구
1. working-hours 관련 서비스 함수들 구현 또는 export 추가

### 3단계: 추가 분석
1. Manager 역할 분석 완료 후 전체적인 미사용 파일 최종 확인
2. 의존성 그래프 생성하여 orphan 파일 식별