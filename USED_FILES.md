# 실제 사용중인 파일 목록

## Member 역할

### 접근 가능한 페이지
- `/member` - 대시보드
- `/member/chat` - 채팅 목록
- `/member/chat/[roomId]` - 채팅방
- `/member/pt` - PT 목록
- `/member/pt/new` - PT 신청
- `/member/pt/[id]` - PT 상세
- `/member/pt/[id]/[ptRecordId]` - PT 기록 상세
- `/member/pt/[id]/[ptRecordId]/scheduleChange` - 일정 변경
- `/member/post` - 게시판
- `/member/profile` - 프로필
- `/member/profile/edit` - 프로필 수정

### 사용중인 API 엔드포인트
- `/api/member/dashboard`
- `/api/member/profile`
- `/api/member/chat/connect`
- `/api/member/pt-list`
- `/api/member/pt/[id]`
- `/api/member/pt/preschedule`
- `/api/member/pending-pt-check`
- `/api/member/trainer-schedule`
- `/api/member/pt-programs-by-center`
- `/api/member/fitness-centers`

## Trainer 역할

### 접근 가능한 페이지
- `/trainer` - 대시보드
- `/trainer/chat` - 채팅
- `/trainer/pt` - PT 관리
- `/trainer/schedule` - 스케줄
- `/trainer/profile` - 프로필

### 사용중인 API 엔드포인트
(추적 진행중)

## Manager 역할

### 접근 가능한 페이지
- `/manager` - 대시보드
- `/manager/centers` - 센터 관리
- `/manager/centers/[id]` - 센터 상세
- `/manager/centers/[id]/machines` - 머신 관리
- `/manager/centers/[id]/equipments` - 장비 관리
- `/manager/trainers` - 트레이너 관리
- `/manager/trainers/[centerId]/[trainerId]` - 트레이너 상세
- `/manager/trainers/[centerId]/set-trainers` - 트레이너 배정
- `/manager/members` - 회원 관리
- `/manager/members/[id]` - 회원 상세
- `/manager/product` - 상품 관리
- `/manager/product/pt` - PT 상품
- `/manager/product/membership` - 멤버십 상품
- `/manager/pt-requests` - PT 승인 대기
- `/manager/sessions` - 세션 관리

### 사용중인 API 엔드포인트
- `/api/manager/trainers`
- `/api/manager/trainers/[id]`
- `/api/manager/trainers/[id]/pt`
- `/api/manager/trainers/[id]/center-default-hours`
- `/api/manager/trainers/[id]/working-hours`
- `/api/manager/trainers/center-assignment`
- `/api/manager/trainers/center-assignment/[centerId]`
- `/api/manager/members`
- `/api/manager/members/[id]`
- `/api/manager/members/[id]/pt-records`
- `/api/manager/fitness-centers`
- `/api/manager/machines/[id]`
- `/api/manager/product/pt`
- `/api/manager/product/pt/[id]`
- `/api/manager/product/membership`

## 공통 컴포넌트
- `/app/components/ui/*` - UI 컴포넌트
- `/app/components/member/member_tabbar.tsx`
- `/app/components/trainer/trainerTabBar.tsx`
- `/app/components/chat/*` - 채팅 관련 컴포넌트

## 서비스 파일
- `/app/lib/services/member.service.ts`
- `/app/lib/services/member/member-dashboard.service.ts`
- (추가 추적 필요)

## 유틸리티
- `/app/lib/utils/time.utils.ts`
- (추가 추적 필요)