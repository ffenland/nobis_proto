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
- **Error Monitoring**: Sentry for error tracking and performance monitoring

### Application Structure

#### User Roles & Access Control

The application has four distinct user roles with different interfaces:

- **MEMBER**: `/member/*` - Members can book PT sessions, manage memberships, chat with trainers
- **TRAINER**: `/trainer/*` - Trainers manage PT sessions, record workouts, approve applications
- **MANAGER**: `/manager/*` - Center managers (trainers with extra viewing permissions for their assigned center)
- **MASTER**: `/master/*` - System administrators with full access to all centers and operations

### Service Architecture

#### Authentication & Sessions

**Session Structure:**

```typescript
interface Session {
  id: string; // User 모델의 id (사용자 고유 ID)
  role: "MANAGER" | "MEMBER" | "TRAINER" | "MASTER"; // 로그인한 유저의 역할
  roleId: string; // 해당 역할 모델의 id
  // - role이 "TRAINER"면 Trainer 모델의 id
  // - role이 "MEMBER"면 Member 모델의 id
  // - role이 "MANAGER"면 Manager 모델의 id
  // - role이 "MASTER"면 Master 모델의 id
}
```

**Important:** API routes should use `session.roleId` when accessing role-specific data:
- `/api/trainer/*` routes: use `session.roleId` as trainerId
- `/api/member/*` routes: use `session.roleId` as memberId
- `/api/manager/*` routes: use `session.roleId` as managerId
- `/api/master/*` routes: use `session.roleId` as masterId

### Role Switching & Dual Role System

#### Overview

MANAGER and MASTER roles are designed as "dual roles" - users with these roles also have a TRAINER profile and can switch between roles without re-authentication.

**Role Structure:**
- **MEMBER**: `/member/*` - General members, PT booking and membership management
- **TRAINER**: `/trainer/*` - Trainers, PT session management and member management
- **MANAGER**: `/manager/*` - Center managers (trainers with extra viewing permissions for assigned center)
- **MASTER**: `/master/*` - System administrators with full access to all centers

#### Database Relationships

**Manager Model:**
```prisma
model Manager {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @unique @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  trainerId String   @unique @db.Uuid  // 1:1 relationship with Trainer
  trainer   Trainer  @relation(fields: [trainerId], references: [id])
  // ... other fields
}
```

**Master Model:**
```prisma
model Master {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String          @unique @db.Uuid
  user          User            @relation(fields: [userId], references: [id])
  trainerId     String          @unique @db.Uuid  // 1:1 relationship with Trainer
  trainer       Trainer         @relation(fields: [trainerId], references: [id])
  fitnessCenter FitnessCenter[]
  // ... other fields
}
```

#### Role Switching Mechanism

Users with MANAGER or MASTER profiles can switch between TRAINER ↔ MANAGER or TRAINER ↔ MASTER using the role-switch feature in the UserDropdownMenu component.

**How it works:**
1. User clicks role-switch button in header dropdown
2. API calls `switchUserRole()` service function
3. Session is updated with new role and roleId
4. User is redirected to the appropriate dashboard
5. SWR cache is invalidated to update UI immediately

**Session behavior during role-switch:**
- TRAINER → MANAGER: `session.role` changes to "MANAGER", `session.roleId` becomes Manager's id
- MANAGER → TRAINER: `session.role` changes to "TRAINER", `session.roleId` becomes Trainer's id
- TRAINER → MASTER: `session.role` changes to "MASTER", `session.roleId` becomes Master's id
- MASTER → TRAINER: `session.role` changes to "TRAINER", `session.roleId` becomes Trainer's id

**Frontend Implementation:**
```typescript
// GlobalHeader.tsx automatically shows role-switch option when:
// - User has Manager profile (data.user.hasManagerProfile)
// - User has Master profile (data.user.hasMasterProfile)

<UserDropdownMenu
  showRoleSwitch={data.role === "TRAINER" && data.user.hasManagerProfile}
  targetRole="MANAGER"
/>
```

#### API Route Permissions

**Master-only API routes:**
```typescript
// Only MASTER can access
if (sessionOrResponse.role !== "MASTER") {
  return NextResponse.json({ error: "Master 권한이 필요합니다." }, { status: 403 });
}
```

**Manager-only API routes:**
```typescript
// Only MANAGER can access (not MASTER)
if (sessionOrResponse.role !== "MANAGER") {
  return NextResponse.json({ error: "Manager 권한이 필요합니다." }, { status: 403 });
}
```

**Trainer-only API routes:**
```typescript
// Only TRAINER can access
if (sessionOrResponse.role !== "TRAINER") {
  return NextResponse.json({ error: "Trainer 권한이 필요합니다." }, { status: 403 });
}
```

## Development Guidelines

### Service Layer Principles (기본 개발 방식)

- **타입선언은 서비스파일에서 한다**: 모든 타입 관리를 서비스 파일에서 집중화
- **API route 파일은 순수하게 라우팅작업만 담당한다**: 비즈니스 로직 분리
- **서비스함수에서 반환하는 값에 대한 타입은 추론을 사용한다**: 유지보수성 향상을 위한 타입 추론 활용
- **Prisma select만 사용**: include 대신 select만 사용하여 불필요한 서버 요청 최소화

### Service File Organization

**IMPORTANT: Service File Locations**

- **Legacy services**: `app/lib/services/` - 레거시 파일들, 점진적으로 마이그레이션 중
- **New services**: `app/services/` - 새로운 서비스 파일들은 모두 여기에 작성

모든 새로운 서비스 로직은 `app/services/` 폴더에 작성하며, 레거시 코드는 필요시에만 참조합니다.

### Data Fetching Architecture

모든 데이터 페칭과 변경은 **API Route + SWR + service.ts** 패턴을 사용합니다:

```typescript
// ✅ Service Layer
// app/services/member.service.ts
import prisma from "@/app/lib/prisma";

export async function getMemberProfile(userId: string) {
  const profile = await prisma.member.findUnique({
    where: { userId },
    select: {
      id: true,
      username: true,
      email: true,
      // ... 필요한 필드들 (include 사용 금지)
    },
  });

  if (!profile) throw new Error("Profile not found");
  return profile;
}

// 타입 추론
export type GetMemberProfileResult = Awaited<
  ReturnType<typeof getMemberProfile>
>;

// ✅ API Route - 순수 라우팅만 담당
// app/api/member/profile/route.ts
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getMemberProfile(session.userId);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Client Component with SWR
import useSWR from "swr";

const { data, error, isLoading } = useSWR("/api/member/profile");
```

### 아키텍처 원칙

- **Server Actions 사용 금지**: 일관성을 위해 모든 데이터 처리는 API Route를 통해 수행
- **서비스 레이어 필수**: 모든 비즈니스 로직은 서비스 파일에 구현
- **API Route는 단순 라우팅**: 인증 확인과 서비스 함수 호출만 담당
- **SWR 사용**: 데이터 페칭과 캐싱을 위해 SWR 사용 (React Query 대신)

### **CRITICAL: API Route 표준 템플릿**

**모든 API Route 파일(`route.ts`)은 반드시 다음 템플릿을 따라야 합니다:**

```typescript
import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 (필요한 경우)
  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    // 서비스 함수 호출
    const data = await serviceFunction(sessionOrResponse.roleId);
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_XXX",
      userId: sessionOrResponse.id,
      metadata: { action: "actionName" },
      tags: ["api", "error-category"]
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

**템플릿 적용 규칙:**
1. ✅ **필수**: `getSessionOrReturn401()` 사용하여 세션 확인
2. ✅ **필수**: 역할 확인이 필요한 경우 `sessionOrResponse.role` 체크
3. ✅ **필수**: 모든 비즈니스 로직은 `try-catch` 내부에 작성
4. ✅ **필수**: catch 블록에서 `logApiError` 호출
5. ❌ **금지**: 템플릿을 벗어난 독자적인 인증/에러 처리 방식

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

#### Date 타입 처리 규칙

**CRITICAL: 서버에서 Date 객체는 항상 toISOString()으로 변환 후 반환**

**서버-클라이언트 간 Date 객체 전달 방식:**

- **서버 (필수)**: Prisma에서 조회한 Date 객체는 **반드시 `.toISOString()`으로 변환 후 반환**
- **타입 추론**: 서비스 함수의 반환 타입은 추론 사용 (`.toISOString()` 적용 시 자동으로 string 타입으로 추론됨)
- **클라이언트**: 서버에서 받은 ISO 문자열을 `new Date(serverDate)` 또는 유틸리티 함수로 변환하여 사용

**이유:**
- Timezone 문제를 방지
- 타입 추론이 정확하게 string으로 인식됨
- 클라이언트에서 타입 안전성 확보

**예시:**
```typescript
// ✅ 서버 (Service Layer)
export async function getData() {
  const data = await prisma.model.findMany({
    select: {
      createdAt: true, // Date 타입
      scheduledAt: true, // Date 타입
    }
  });

  // 필수: Date 객체를 ISO 문자열로 변환
  return data.map(item => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    scheduledAt: item.scheduledAt.toISOString(),
  }));
}

// 타입 추론 결과
export type GetDataResult = Awaited<ReturnType<typeof getData>>;
// => { createdAt: string, scheduledAt: string, ... }

// ✅ 클라이언트 (Component)
const { data } = useSWR<GetDataResult>('/api/data');
const date = new Date(data.createdAt); // string을 Date로 변환
formatDateWithoutWeekday(data.scheduledAt); // 유틸리티 함수 사용
```

**❌ 잘못된 예시:**
```typescript
// ❌ Date 객체를 그대로 반환하면 안됨
return {
  createdAt: prismaData.createdAt, // Date 타입으로 추론되지만 실제로는 string
};
```

#### **CRITICAL: 서버 환경 UTC 원칙**

**모든 서버 코드는 UTC 타임존을 가정하고 작성해야 합니다.**

배포 환경의 서버는 UTC 타임존으로 설정되어 있으므로, 개발 환경과 무관하게 항상 UTC 기준으로 코드를 작성해야 합니다.

**서버 코드 (API Routes & Services):**

- ✅ **필수**: 항상 UTC 기준으로 Date 객체 처리
- ✅ **필수**: UTC 메서드 사용: `getUTCDay()`, `getUTCHours()`, `getUTCDate()`, `getUTCMonth()` 등
- ✅ **허용**: KST가 필요한 경우 `getKSTToday()` 같은 유틸리티 함수로 명시적 변환
- ✅ **필수**: 응답은 `.toISOString()`으로 반환 (타임존 정보 포함)
- ❌ **금지**: `getDay()`, `getHours()` 등 로컬 타임존 메서드 사용 (서버 환경에 따라 다른 결과)

**클라이언트 코드 (Components):**

- ✅ 서버에서 받은 ISO 문자열을 `new Date()`로 변환
- ✅ 사용자의 로컬 타임존에 맞게 표시
- ✅ `getDay()`, `getHours()` 등 로컬 메서드 사용 가능 (브라우저 타임존 기준)

**데이터베이스:**

- ✅ Prisma의 `DateTime` 필드는 UTC로 저장
- ✅ 조회/비교 시 UTC 기준 Date 객체 사용

**예시:**

```typescript
// ✅ 서버 코드 - UTC 메서드 사용
export async function getWeeklyData() {
  const today = getKSTToday(); // KST 0시 0분 = UTC 전날 15시
  const currentDate = new Date(today);

  // UTC 기준으로 요일 판단
  if (currentDate.getUTCDay() !== 6) { // KST 일요일 = UTC 토요일
    // ...
  }

  return {
    date: currentDate.toISOString(), // ISO 문자열로 반환
  };
}

// ✅ 클라이언트 코드 - 로컬 메서드 사용
const { data } = useSWR('/api/weekly-data');
const date = new Date(data.date);
const dayName = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()]; // 로컬 타임존
```

**❌ 잘못된 예시:**
```typescript
// ❌ 서버에서 로컬 타임존 메서드 사용
export async function getData() {
  const date = new Date();
  if (date.getDay() === 0) { // 서버 타임존에 따라 다른 결과!
    // ...
  }
}
```

### Next.js 15 Dynamic Route Parameters

Next.js 15에서 동적 라우트 파라미터 처리 방식이 변경되었습니다. 파라미터는 이제 Promise로 제공됩니다.

**올바른 사용법:**

```typescript
// API Route with dynamic params
type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id } = params;
  // 이제 id를 사용할 수 있음
}
```

## Media Management System (Cloudflare Images & Stream)

### **IMPORTANT: Media Upload Guidelines**

**모든 이미지/비디오 업로드는 통합 미디어 시스템을 사용해야 합니다:**

- ❌ **금지**: 직접 Cloudflare API 호출 또는 개별 업로드 시스템 구현
- ✅ **필수**: `/app/services/media/media.service.ts`의 통합 미디어 시스템 사용

**표준 업로드 패턴:**

```typescript
// 1. Upload URL 요청
const uploadUrlResponse = await fetch("/api/media/images/upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entityType: "EQUIPMENT", // 또는 다른 타입
    entityId: entityId,
  }),
});
const { uploadURL, customId } = await uploadUrlResponse.json();

// 2. Cloudflare 직접 업로드
const formData = new FormData();
formData.append("file", file);
await fetch(uploadURL, { method: "POST", body: formData });

// 3. 업로드 확인 및 DB 저장
await fetch("/api/media/images/confirm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cloudflareId: customId,
    entityType: "EQUIPMENT",
    entityId: entityId,
  }),
});
```

**이미지 삭제:**
```typescript
await fetch(`/api/media/images/${imageId}`, { method: "DELETE" });
```

### Media Upload/Delete Principles

미디어 업로드와 삭제는 항상 **Cloudflare를 먼저 처리**하고, 성공한 경우에만 DB를 업데이트합니다:

#### Upload Flow
1. Cloudflare에 Direct Upload URL 생성
2. 클라이언트가 Cloudflare로 직접 업로드
3. 업로드 성공 확인 후 DB에 레코드 생성

#### Delete Flow
1. DB에서 미디어 정보 조회 및 권한 확인
2. **Cloudflare에서 먼저 삭제 시도**
3. Cloudflare 삭제 성공 시 DB에서 삭제 (소프트 삭제)

## Sentry Error Monitoring

### Best Practices and Usage Guidelines

**Exception Catching:**

```typescript
import * as Sentry from "@sentry/nextjs";

// Catch and report errors with context
try {
  return getUser();
} catch (error) {
  Sentry.captureException(error);
}

// Using ErrorReporter utility (our wrapper)
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

try {
  // Your code
} catch (error) {
  await ErrorReporter.report(error, {
    action: "user-action",
    metadata: {
      description: "한국어 컨텍스트",
      // additional metadata
    },
  });
}
```

**API Route Error Handling Pattern:**

```typescript
export async function GET(request: Request) {
  let session;
  try {
    session = await getSession();
    const data = await service.getData(session.id);
    return NextResponse.json(data);
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "api-get-data",
      userId: session?.id,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

## System Error Logging (에러 로깅 시스템)

### **CRITICAL: 모든 Route & Service에서 필수 적용**

**모든 API Route와 Service 함수에서 에러 로깅은 필수입니다:**
- ✅ **필수**: try-catch 블록에서 에러 발생 시 반드시 에러 로깅 시스템 사용
- ❌ **금지**: console.error만 사용하고 에러 로깅을 생략하는 것

### 필수 적용 패턴

#### API Route 패턴 (필수)
```typescript
export async function GET(request: Request) {
  let session;
  try {
    session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await serviceFunction(session.roleId);
    return NextResponse.json(data);
  } catch (error) {
    // 🎯 필수: 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "API_001",
      userId: session?.id,
      metadata: {
        action: "getData",
      },
      tags: ["api", "service-error"]
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

#### Service Layer 패턴 (필수)
```typescript
export async function createPTRecord(lessonId: string, exerciseData: any) {
  try {
    const result = await prisma.lessonRecord.create({
      data: exerciseData,
    });
    return result;
  } catch (error) {
    // 🎯 필수: 에러 로깅
    await errorLogger.error(
      "PT 기록 생성 실패",
      error as Error,
      {
        service: "PTService",
        function: "createPTRecord",
        lessonId,
      }
    );
    throw error;
  }
}
```

### Service Functions

```typescript
import { logError, errorLogger } from "@/app/services/error/error-logging.service";

// 메인 로깅 함수
await logError({
  message: "PT 기록 저장 실패",
  level: ErrorLevel.ERROR,
  errorCode: "PT_001",
  userId: "user123",
  metadata: { lessonId: "lesson456" },
  tags: ["pt", "database", "critical"]
});

// 편의 함수들
await errorLogger.debug("디버그 메시지", { query: "SELECT ..." });
await errorLogger.info("사용자 로그인", { userId: "123" });
await errorLogger.error("결제 실패", error, { paymentId: "pay_123" });
```