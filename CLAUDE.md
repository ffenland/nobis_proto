# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands

- **Development server**: `npm run dev` - Start the Next.js development server
- **Build**: `npm run build` - Build the application for production
- **Production server**: `npm run start` - Start the production server
- **Linting**: `npm run lint` - Run ESLint to check code quality

### Database Commands

- **Generate Prisma client**: `npx prisma generate` - Generate Prisma client after schema changes
- **Database migrations**: `npx prisma migrate dev` - Run database migrations in development
- **Database reset**: `npx prisma migrate reset` - Reset database and run all migrations
- **Prisma studio**: `npx prisma studio` - Open Prisma studio for database management

## Project Architecture

### Core Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Iron Session for session management
- **Real-time**: Supabase for chat functionality
- **Styling**: Tailwind CSS with DaisyUI components
- **State Management**: SWR for data fetching and caching
- **Forms**: React Hook Form with Zod validation
- **File Storage**: Media service for file uploads (images/videos)

### Application Structure

#### User Roles & Access Control

The application has three distinct user roles with different interfaces:

- **MEMBER**: `/member/*` - Members can book PT sessions, manage memberships, chat with trainers
- **TRAINER**: `/trainer/*` - Trainers manage PT sessions, record workouts, approve applications
- **MANAGER**: `/manager/*` - Managers oversee centers, products, trainers, and analytics

#### Key Business Domains

**Personal Training (PT) System**:

- PT products and scheduling managed through `app/lib/pt.ts`
- Complex booking system with trainer availability and member scheduling
- Recording system for workout sessions with detailed exercise tracking
- Service layer: `app/lib/services/pt-*.service.ts` files

**Fitness Center Management**:

- Multi-center support with center-specific trainers, members, and equipment
- Machine management with configurable settings and values
- Opening hours and off-day scheduling

**Membership System**:

- Membership products with time-based activation
- Coupon system for discounts on PT and membership
- Payment integration with NicePay

**Exercise Recording**:

- Three types of exercises: MACHINE, FREE (weights), STRETCHING
- Detailed set/rep tracking with photos and notes
- Equipment management (machines, weights, stretching exercises)

**Chat System**:

- Real-time messaging between members and trainers using Supabase
- Chat room management with participant tracking
- Message read status tracking

### Service Architecture

#### Authentication & Sessions

- Session management in `app/lib/session.ts`
- Social login support (Kakao, Naver) in `app/lib/socialLogin.ts`
- Role-based middleware in `middleware.ts`

#### Media Management

- Unified media system supporting images and videos
- Automatic cleanup and storage management
- Usage tracking per user with limits

#### Database Schema Highlights

- Complex relationship between Users, Trainers, Members, and Managers
- PT system with scheduling, records, and payment tracking
- Flexible media system supporting multiple entity types
- Rate limiting and logging for API security

### File Organization Patterns

#### API Routes

- Organized by user role (`/api/member/`, `/api/trainer/`, `/api/manager/`)
- RESTful patterns with clear resource boundaries
- Common utilities in `/api/common/`

#### Components

- Role-specific component directories (`components/member/`, `components/trainer/`)
- Shared UI components in `components/ui/`
- Business logic components organized by feature

#### Services

- Business logic abstracted into service layers (`app/lib/services/`)
- Database operations centralized in service files
- Clear separation between API routes and business logic

### State Management Patterns

- SWR for client-side data fetching and caching
- React Query for complex server state management
- Form state managed with React Hook Form
- Session state through Iron Session with secure cookies

## PT Recording System Architecture

### Overview

The PT (Personal Training) recording system allows trainers to record exercise details during and after training sessions. The system was recently refactored to separate real-time recording during sessions from post-session editing.

### Directory Structure

```
/app/trainer/pt/[id]/[ptRecordId]/
├── record/                     # Real-time recording during PT session
│   ├── page.tsx               # Server component with time checks
│   └── RecordForm.tsx         # Client component for recording UI
├── edit/                      # Post-session editing
│   ├── page.tsx              # Lists all recorded exercises
│   ├── components/           # Reusable exercise components
│   │   ├── FreeRecord.tsx    # Free weight exercises
│   │   ├── MachineRecord.tsx # Machine-based exercises
│   │   ├── StretchingRecord.tsx # Stretching exercises
│   │   └── types.ts          # Shared TypeScript types
│   └── [itemId]/            # Edit individual exercises
└── actions.ts               # Server actions for data operations
```

### Key Design Patterns

#### 1. Dual-Mode Components

Exercise recording components support both create and edit modes:

```typescript
interface ComponentProps {
  mode?: "create" | "edit";
  initialData?: InitialDataType;
  onSubmit?: (data: SubmitDataType) => Promise<void>;
}
```

#### 2. Time-Based Access Control

- **Recording**: Allowed 30 min before to 1 hour after session
- **Editing**: Allowed 5 min before to 1 hour after session
- Enforced via server-side checks in `checkRecordTimePermissionAction`

#### 3. API Routes Pattern

All data operations go through API routes:

```typescript
// API Route
export async function PUT(request: Request) {
  // Authentication and routing
  const result = await ptRecordService.update(data);
  return NextResponse.json(result);
}

// Client component
const { trigger } = useSWRMutation('/api/trainer/pt-records', updateFetcher);
```

#### 4. Type Safety Architecture

- Service functions return inferred Prisma types
- Service files export type utilities: `type TData = Awaited<ReturnType<typeof serviceFunction>>`
- Components use strictly typed interfaces for data flow

### Exercise Types and Data Structure

#### Machine Exercise (MACHINE)

- Complex settings per machine (weight, angle, seat position, etc.)
- Multiple sets with customizable machine settings
- Each set tracks reps and setting values

#### Free Weight Exercise (FREE)

- Multiple sets with rep tracking
- Equipment selection per set (dumbbells, barbells, etc.)
- Flexible for various free weight movements

#### Stretching Exercise (STRETCHING)

- Single exercise selection from predefined list
- Optional equipment usage
- Focus on form and duration notes

### Component Communication Flow

```
1. Client Component
   ↓ Fetches data via SWR from API Route
2. API Route calls Service Layer
   ↓ User interaction
3. Form submission → API Route → Service Layer
   ↓ Database update
4. SWR revalidation → Updated UI
```

### Recent Refactoring Improvements

1. **Separation of Concerns**: Split `/edit` path into `/record` (create) and `/edit` (modify)
2. **Component Reusability**: Made exercise components work in both modes
3. **Type Safety**: Created shared type definitions in `types.ts`
4. **Bug Fixes**: Addressed state management issues in MachineRecord:
   - Added unique IDs to sets for proper React reconciliation
   - Implemented functional state updates to prevent stale closures
   - Added onBlur handlers to ensure input values are captured

## Development Guidelines

### Service Layer Principles (기본 개발 방식)

- **타입선언은 서비스파일에서 한다**: 모든 타입 관리를 서비스 파일에서 집중화
- **API route 파일은 순수하게 라우팅작업만 담당한다**: 비즈니스 로직 분리
- **서비스함수에서 반환하는 값에 대한 타입은 추론을 사용한다**: 유지보수성 향상을 위한 타입 추론 활용
- **Prisma select만 사용**: include 대신 select만 사용하여 불필요한 서버 요청 최소화

### Data Fetching Architecture

모든 데이터 페칭과 변경은 **API Route + SWR + service.ts** 패턴을 사용합니다:

```typescript
// ✅ Service Layer
// app/lib/services/member.service.ts
import prisma from '@/app/lib/prisma';

// 타입 정의
export type MemberProfile = {
  id: string;
  username: string;
  email: string;
  // ... 필요한 필드들
};

// 서비스 함수 - 타입 추론 활용
export async function getMemberProfile(userId: string) {
  const profile = await prisma.member.findUnique({
    where: { userId },
    select: {
      id: true,
      username: true,
      email: true,
      // ... 필요한 필드들 (include 사용 금지)
    }
  });
  
  if (!profile) throw new Error('Profile not found');
  return profile;
}

// 타입 추론
export type GetMemberProfileResult = Awaited<ReturnType<typeof getMemberProfile>>;

// ✅ API Route - 순수 라우팅만 담당
// app/api/member/profile/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { getMemberProfile } from '@/app/lib/services/member.service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const profile = await getMemberProfile(session.userId);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ Client Component with SWR
import useSWR from 'swr';

const { data, error, isLoading } = useSWR('/api/member/profile');
```

### 데이터 변경 예시 (POST/PUT/DELETE)

```typescript
// Service Layer
export async function updateMemberProfile(userId: string, data: UpdateProfileInput) {
  const updated = await prisma.member.update({
    where: { userId },
    data,
    select: { /* 필요한 필드 */ }
  });
  return updated;
}

// API Route
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const result = await updateMemberProfile(session.userId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Client Component with SWR mutation
import useSWRMutation from 'swr/mutation';

const { trigger, isMutating } = useSWRMutation(
  '/api/member/profile',
  async (url, { arg }) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arg),
    });
    return response.json();
  }
);
```

### 아키텍처 원칙

- **Server Actions 사용 금지**: 일관성을 위해 모든 데이터 처리는 API Route를 통해 수행
- **서비스 레이어 필수**: 모든 비즈니스 로직은 서비스 파일에 구현
- **API Route는 단순 라우팅**: 인증 확인과 서비스 함수 호출만 담당
- **SWR 사용**: 데이터 페칭과 캐싱을 위해 SWR 사용 (React Query 대신)

### Time Management Convention

#### 시간 데이터 저장 및 처리 규칙

**저장 형식:**
- 모든 시간 정보는 **number(Int) 타입**으로 저장
- **군대식 4자리 표기법** 사용 (HHMM)
- 예시: 1430 = 14시 30분, 900 = 9시 0분, 2200 = 22시 0분

**시간 처리 함수:**
- 모든 시간 관련 함수는 `@/app/lib/utils/time.utils.ts`에 정의
- 주요 함수:
  - `formatTime(time: number): string` - "14:30" 형식으로 변환
  - `parseTime(timeStr: string): TimeInt` - "14:30"을 1430으로 변환
  - `addThirtyMinutes(time: number): TimeInt` - 30분 추가
  - `isValidTimeSlot(time: number): boolean` - 30분 단위 검증

**구현 예시:**
```typescript
// DB에서 시간 가져오기
const schedule = await prisma.ptSchedule.findUnique({
  select: {
    startTime: true, // 1430 (number)
    endTime: true,   // 1530 (number)
  }
});

// 클라이언트에 전달할 때 포맷팅
import { formatTime } from "@/app/lib/utils/time.utils";

return {
  startTime: formatTime(schedule.startTime), // "14:30" (string)
  endTime: formatTime(schedule.endTime),     // "15:30" (string)
};

// 사용자 입력 받을 때
import { parseTime } from "@/app/lib/utils/time.utils";

const timeInt = parseTime("14:30"); // 1430 (number)
await prisma.ptSchedule.create({
  data: {
    startTime: timeInt, // DB에는 number로 저장
  }
});
```

**주의사항:**
- DB 스키마에서 시간 필드는 항상 `Int` 타입
- 클라이언트 표시용으로만 string 변환
- 시간 계산이나 비교는 number 상태에서 수행
- 새로운 시간 관련 유틸리티가 필요하면 `time.utils.ts`에 추가

**날짜/시간 유틸리티 사용 원칙:**
- 날짜, 시간과 관련된 util 함수가 필요한 경우 `time.utils.ts`를 확인하고, 필요한 함수가 존재한다면 import 해서 사용한다
- 필요한 함수가 없다면 `time.utils.ts` 파일에 작성하고 import해서 사용한다
- 모든 시간/날짜 관련 유틸리티는 중앙화하여 일관성을 유지한다

### Development Workflow

#### Task-Driven Development Process

1. **Analyze Current State**: Examine existing code, identify patterns, understand context
2. **Plan Implementation**: Break down into concrete, executable tasks
3. **Iterative Development**: Implement one task at a time with verification
4. **Validate Integration**: Ensure changes work with existing systems
5. **Document Progress**: Log changes and maintain consistency

#### Task Management Principles

- Create specific, testable subtasks
- Implement incrementally with frequent validation
- Maintain backwards compatibility
- Follow established patterns and conventions
- Use tagged workflows for complex changes

#### Code Analysis Techniques

- Examine file structure and naming conventions
- Understand data flow and state management
- Review API patterns and error handling
- Analyze component hierarchy and prop patterns
- Study database schema relationships

#### Implementation Best Practices

- Follow existing code style and patterns
- Maintain consistent error handling
- Ensure proper type safety with TypeScript
- Test critical paths before proceeding
- Document complex business logic

### Best Practices for PT Recording System

1. **Always use API routes** for all data operations
2. **Maintain type safety** by using the exported type utilities
3. **Handle loading states** properly in client components
4. **Validate permissions** server-side before any operations
5. **Use functional updates** for setState to avoid stale closure bugs
6. **Implement proper error handling** with user-friendly messages

### Common Pitfalls to Avoid

1. Don't call service functions directly in components - use API routes
2. Don't use array indices as React keys - use stable unique IDs
3. Don't mutate state directly - use functional updates
4. Don't trust client-side time checks - always validate server-side
5. Don't forget to handle edge cases (empty sets, missing equipment, etc.)

### Git Integration Patterns

- Clear commit messages with business context
- Feature branch workflow for complex changes
- Progressive commits for iterative development
- Proper merge strategies for collaboration

This architecture supports a complex fitness center management system with multi-role access, real-time communication, detailed workout tracking, and comprehensive business management features.
