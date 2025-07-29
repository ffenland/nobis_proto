# API Route 사용 현황 분석

## 사용 중인 API Routes

### 인증 관련
- `/api/auth/session/route.ts` → 사용 여부 미확인
- `/api/upload/create-upload-url/route.ts` → trainer/profile/edit/page.tsx, components/upload/VideoUpload.tsx, components/upload/ImageUpload.tsx
- `/api/upload/complete/route.ts` → trainer/profile/edit/page.tsx, components/upload/VideoUpload.tsx, components/upload/ImageUpload.tsx

### 회원(Member) 관련
- `/api/member/dashboard/route.ts` → member/page.tsx
- `/api/member/profile/route.ts` → member/profile/page.tsx, member/profile/edit/page.tsx
- `/api/member/profile/avatar/route.ts` → member/profile/edit/page.tsx
- `/api/member/profile/username/route.ts` → member/profile/edit/page.tsx
- `/api/member/pt-list/route.ts` → member/pt/page.tsx
- `/api/member/pt/[id]/route.ts` → member/pt/[id]/page.tsx
- `/api/member/pending-pt-check/route.ts` → member/pt/new/page.tsx
- `/api/member/fitness-centers/route.ts` → member/pt/new/components/CenterSelectionStep.tsx
- `/api/member/pt/preschedule/route.ts` → member/pt/new/components/ConfirmationStep.tsx
- `/api/member/chat/connect/route.ts` → member/chat/connect/page.tsx

### 트레이너(Trainer) 관련
- `/api/trainer/dashboard/route.ts` → trainer/page.tsx
- `/api/trainer/profile/route.ts` → trainer/profile/edit/page.tsx
- `/api/trainer/schedule/route.ts` → trainer/schedule/weekly-schedule/page.tsx, components/schedule/ScheduleCalendar.tsx
- `/api/trainer/schedule/off/route.ts` → trainer/schedule/off/page.tsx, trainer/schedule/off/components/DayOffSelector.tsx
- `/api/trainer/schedule/off/[id]/route.ts` → trainer/schedule/off/page.tsx
- `/api/trainer/working-hours/route.ts` → trainer/schedule/off/components/TrainerWorkingHourManager.tsx
- `/api/trainer/machine-set-records/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/MachineRecord.tsx
- `/api/trainer/free-exercises/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/FreeRecord.tsx
- `/api/trainer/chat/connect/route.ts` → trainer/chat/connect/page.tsx

### 매니저(Manager) 관련
- `/api/manager/members/route.ts` → manager/members/page.tsx
- `/api/manager/members/[memberId]/route.ts` → manager/members/[id]/page.tsx
- `/api/manager/members/[memberId]/pt-records/route.ts` → manager/members/[id]/page.tsx
- `/api/manager/fitness-centers/route.ts` → manager/members/page.tsx
- `/api/manager/trainers/route.ts` → manager/trainers/[centerId]/page.tsx
- `/api/manager/trainers/[trainerId]/route.ts` → manager/trainers/temp/page.tsx, manager/trainers/[centerId]/[trainerId]/page.tsx
- `/api/manager/trainers/[trainerId]/pt/route.ts` → manager/trainers/temp/page.tsx, manager/trainers/[centerId]/[trainerId]/page.tsx
- `/api/manager/trainers/[trainerId]/pt/[ptId]/route.ts` → manager/trainers/temp/pt/[ptId]/page.tsx
- `/api/manager/trainers/[trainerId]/center-default-hours/route.ts` → manager/trainers/[centerId]/[trainerId]/page.tsx
- `/api/manager/trainers/[trainerId]/working-hours/route.ts` → manager/trainers/[centerId]/[trainerId]/page.tsx
- `/api/manager/product/membership/route.ts` → manager/product/membership/new/page.tsx
- `/api/manager/product/pt/route.ts` → manager/product/pt/new/page.tsx, manager/product/pt/[id]/edit/page.tsx
- `/api/manager/product/pt/[id]/route.ts` → manager/product/pt/[id]/edit/page.tsx
- `/api/manager/machines/[id]/route.ts` → manager/centers/[id]/machines/[machineId]/page.tsx
- `/api/manager/schedule/route.ts` → components/schedule/ScheduleCalendar.tsx

### 센터 관련
- `/api/centers/route.ts` → manager/trainers/page.tsx
- `/api/centers/[id]/working-hours/route.ts` → manager/trainers/[centerId]/page.tsx, manager/trainers/[centerId]/working-hours/page.tsx
- `/api/centers/[id]/machines/route.ts` → 사용 여부 미확인

### 채팅 관련
- `/api/chat/rooms/route.ts` → components/chat/ChatList.tsx
- `/api/chat/[roomId]/messages/route.ts` → components/chat/ChatRoom.tsx
- `/api/chat/[roomId]/info/route.ts` → components/chat/ChatRoom.tsx
- `/api/chat/route.ts` → 사용 여부 미확인
- `/api/chat/unread-count/route.ts` → 사용 여부 미확인
- `/api/chat/[roomId]/read/route.ts` → 사용 여부 미확인

### 스케줄 변경 관련
- `/api/schedule-change/list/route.ts` → trainer/pt/[id]/ScheduleChangeRequests.tsx, components/notifications/ScheduleChangeNotifications.tsx
- `/api/schedule-change/request/route.ts` → trainer/pt/[id]/ScheduleChangeComponent.tsx
- `/api/schedule-change/check-existing/route.ts` → 사용 여부 미확인
- `/api/schedule-change/detail/[requestId]/route.ts` → 사용 여부 미확인
- `/api/schedule-change/approve/[requestId]/route.ts` → 사용 여부 미확인
- `/api/schedule-change/reject/[requestId]/route.ts` → 사용 여부 미확인
- `/api/schedule-change/cancel/[requestId]/route.ts` → 사용 여부 미확인

### 미디어 관련
- `/api/media/upload/image/route.ts` → member/profile/edit/page.tsx (주의: 실제 경로는 다를 수 있음)
- `/api/media/upload/image/direct/route.ts` → 사용 여부 미확인
- `/api/media/upload/video/direct/route.ts` → 사용 여부 미확인
- `/api/media/upload/complete/route.ts` → 사용 여부 미확인
- `/api/media/[id]/route.ts` → 사용 여부 미확인
- `/api/media/list/route.ts` → 사용 여부 미확인

### 소셜 로그인 관련
- `/app/(auth)/login/naver/start/route.ts` → 네이버 로그인 시작 (사용처 확인 필요)
- `/app/(auth)/login/naver/callback/route.ts` → 네이버 로그인 콜백 (사용처 확인 필요)

## 미사용 API Routes (확실한 것들)

다음 API routes는 현재 코드베이스에서 직접적인 호출을 찾을 수 없습니다:

### 공통(Common) 관련
- `/api/common/machines/route.ts`
- `/api/common/machines/[id]/route.ts`

### 매니저 관련
- `/api/manager/stretchings/route.ts`
- `/api/manager/stretchings/[id]/route.ts`
- `/api/manager/free_exercise/route.ts`
- `/api/manager/free_exercise/[id]/route.ts`
- `/api/manager/machines/route.ts`

### 트레이너 관련
- `/api/trainer/pt-records/[id]/items/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/PtRecordWriter.tsx, trainer/pt/[id]/[ptRecordId]/edit/components/FreeRecord.tsx
- `/api/trainer/pt-records/[id]/items/[itemId]/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/[itemId]/EditItemForm.tsx
- `/api/trainer/machines/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/PtRecordWriter.tsx
- `/api/trainer/equipment/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/PtRecordWriter.tsx
- `/api/trainer/free-set-records/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/FreeRecord.tsx
- `/api/trainer/pt-records/[id]/route.ts`
- `/api/trainer/pt-records/[id]/attendance/route.ts`
- `/api/trainer/pt-records/[id]/items/machine/route.ts`
- `/api/trainer/pt-records/[id]/items/stretching/route.ts`
- `/api/trainer/pt-records/[id]/items/free/route.ts`
- `/api/trainer/fitness-centers/route.ts`
- `/api/trainer/stretching-exercises/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/StretchingRecord.tsx
- `/api/trainer/stretching-records/route.ts` → trainer/pt/[id]/[ptRecordId]/edit/components/StretchingRecord.tsx
- `/api/trainer/working-hours/[id]/route.ts`
- `/api/trainer/working-hours/day/[dayOfWeek]/route.ts`
- `/api/trainer/pt/pending/route.ts`
- `/api/trainer/info/route.ts`
- `/api/trainer/schedule-conflict-check/route.ts`

### 회원 관련
- `/api/member/pt-stats/route.ts`
- `/api/member/time-slots/route.ts`
- `/api/member/pt-summary/route.ts`
- `/api/member/recent-records/route.ts`
- `/api/member/info/route.ts`
- `/api/member/pt-apply/route.ts`
- `/api/member/validate-schedule/route.ts`
- `/api/member/pt-programs-by-center/route.ts`
- `/api/member/trainer-schedule/route.ts`

### 업로드 관련
- `/api/upload/stream-status/[streamId]/route.ts`

## API 조직화 제안사항

### 1. 미사용 API 정리
- 위에 나열된 미사용 API routes는 삭제를 고려해야 합니다
- 특히 `/api/trainer/pt-records/` 하위의 많은 routes가 사용되지 않고 있어 정리가 필요합니다

### 2. 중복 기능 통합
- `/api/common/machines/`와 `/api/trainer/machines/`, `/api/manager/machines/`가 중복될 가능성이 있습니다
- 역할별로 분리된 API가 실제로 필요한지 재검토가 필요합니다

### 3. 네이밍 일관성
- 일부 API는 kebab-case를 사용하고 (`/api/trainer/free-set-records/`)
- 일부는 underscore를 사용합니다 (`/api/manager/free_exercise/`)
- 일관된 네이밍 규칙을 적용해야 합니다

### 4. RESTful 패턴 준수
- 현재 대부분의 API가 RESTful 패턴을 따르고 있으나
- 일부 action 기반 API들 (`/api/schedule-change/approve/`, `/api/member/pending-pt-check/`)은 재검토가 필요합니다

### 5. 서버 액션으로의 전환 고려
- 많은 API routes가 단순 CRUD 작업을 수행하고 있어
- Next.js의 Server Actions로 전환하면 코드 간소화가 가능합니다

### 6. API 버전 관리
- 향후 API 변경을 고려하여 `/api/v1/` 같은 버전 관리 도입을 고려해야 합니다

## 추가 분석이 필요한 API Routes

다음 API들은 동적 호출이나 서버 컴포넌트에서의 사용 가능성이 있어 추가 확인이 필요합니다:

- `/api/auth/session/route.ts` - 세션 관리 (미들웨어나 서버 컴포넌트에서 사용 가능)
- `/api/centers/[id]/machines/route.ts` - 센터별 머신 목록
- `/api/chat/route.ts` - 채팅 기본 API
- `/api/chat/unread-count/route.ts` - 읽지 않은 메시지 수
- `/api/chat/[roomId]/read/route.ts` - 메시지 읽음 처리
- `/api/schedule-change/check-existing/route.ts` - 기존 스케줄 변경 요청 확인
- `/api/schedule-change/detail/[requestId]/route.ts` - 스케줄 변경 상세
- `/api/schedule-change/approve/[requestId]/route.ts` - 스케줄 변경 승인
- `/api/schedule-change/reject/[requestId]/route.ts` - 스케줄 변경 거절
- `/api/schedule-change/cancel/[requestId]/route.ts` - 스케줄 변경 취소
- `/api/media/upload/image/direct/route.ts` - 이미지 직접 업로드
- `/api/media/upload/video/direct/route.ts` - 비디오 직접 업로드
- `/api/media/upload/complete/route.ts` - 업로드 완료 처리
- `/api/media/[id]/route.ts` - 미디어 개별 조회
- `/api/media/list/route.ts` - 미디어 목록

## 주의사항

1. 일부 API는 동적으로 호출되거나 서버 컴포넌트에서 직접 사용될 수 있어 추가 확인이 필요합니다
2. 채팅 관련 API들은 Supabase 실시간 기능과 연동되어 있을 수 있어 신중한 검토가 필요합니다
3. 실제 삭제 전에는 프로덕션 로그를 확인하여 실제 사용 여부를 최종 검증해야 합니다
4. 서버 액션으로 마이그레이션된 기능들이 있을 수 있어 actions.ts 파일들과의 교차 확인이 필요합니다
5. 소셜 로그인 routes는 외부 서비스(네이버)에서 콜백으로 호출되므로 유지해야 합니다