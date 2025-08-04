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

### Next.js 15 Dynamic Route Parameters

Next.js 15에서 동적 라우트 파라미터 처리 방식이 변경되었습니다. 파라미터는 이제 Promise로 제공됩니다.

**올바른 사용법:**
```typescript
// API Route with dynamic params
type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params
  const { id } = params
  
  // 이제 id를 사용할 수 있음
}
```

**잘못된 사용법 (이전 방식):**
```typescript
// ❌ Next.js 15에서는 작동하지 않음
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // params가 Promise이므로 직접 접근 불가
}
```

**Page 컴포넌트에서도 동일:**
```typescript
type Params = Promise<{ id: string }>

export default async function Page({
  params,
}: {
  params: Params
}) {
  const { id } = await params
  // ...
}
```

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

## Media Management System (Cloudflare Images & Stream)

### Overview

The application uses Cloudflare Images and Stream services for handling all media uploads (images and videos). The system implements Direct Creator Upload method with custom ID management for systematic organization.

### Architecture Components

#### Service Layer (`/app/lib/services/media/`)
- **`image.service.ts`**: Cloudflare Images API integration
- **`stream.service.ts`**: Cloudflare Stream API integration with TUS protocol support

#### Utilities (`/app/lib/utils/media.utils.ts`)
Core utility functions for media handling:
- `generateMediaId()`: Creates hierarchical custom IDs
- `getOptimizedImageUrl()`: Returns CDN-optimized image URLs with variants
- `validateImageFile()` / `validateVideoFile()`: Client-side validation
- `formatFileSize()` / `formatVideoDuration()`: Display formatting
- Type definitions: `MediaType`, `EntityType`, `ImageVariant`

#### API Routes (`/app/api/media/`)
- **Images**: `/images/upload`, `/images/[id]`
- **Videos**: `/videos/upload`, `/videos/[id]`
- **List**: `/list` - Unified endpoint for fetching media

#### Reusable Components (`/app/components/media/`)
1. **ProfileImageUpload**: Drag-and-drop image upload with preview
2. **ProfileImagePreview**: Optimized image display with fallback
3. **VideoUploader**: Video upload with progress tracking and TUS support
4. **MediaGallery**: Grid gallery with selection and deletion

### Implementation Patterns

#### 1. Custom ID Generation
```typescript
// 계층적 ID 구조: userId/entityType/entityId/timestamp/mediaType
const customId = generateMediaId({
  userId: session.id,
  entityType: 'pt-record', // profile, pt-record, exercise, chat, review
  entityId: recordId,
  mediaType: 'image',
  timestamp: true, // 중복 방지
});
```

#### 2. Direct Creator Upload Flow
```typescript
// 1. 클라이언트가 업로드 URL 요청
const response = await fetch('/api/media/images/upload', {
  method: 'POST',
  body: JSON.stringify({ entityType: 'profile' })
});

// 2. 서버가 Cloudflare에서 URL 생성
const { uploadURL, customId } = await createImageUploadUrl({
  customId,
  metadata: { userId, entityType, ... },
  expiry: new Date(Date.now() + 30 * 60 * 1000),
});

// 3. 클라이언트가 직접 Cloudflare로 업로드
await fetch(uploadURL, {
  method: 'POST',
  body: formData,
});
```

#### 3. Metadata Management
모든 미디어는 구조화된 메타데이터를 포함:
```typescript
{
  userId: string,        // 업로더 ID
  userRole: UserRole,    // 업로더 역할
  entityType: string,    // 연관 엔티티 타입
  entityId: string,      // 연관 엔티티 ID
  uploadedAt: string,    // ISO 8601 타임스탬프
  [key: string]: unknown // 추가 커스텀 데이터
}
```

#### 4. Role-Based Limits
```typescript
// 비디오 업로드 시간 제한 (역할별)
const maxDurationByRole = {
  TRAINER: 600,  // 10분
  MEMBER: 300,   // 5분
  MANAGER: 600,  // 10분
};
```

#### 5. Image Variants
Cloudflare Images는 자동으로 여러 변형을 생성:
- `public`: 일반 표시용
- `thumbnail`: 썸네일 (작은 크기)
- `avatar`: 프로필 이미지용
- `cover`: 커버 이미지용
- `original`: 원본 (서명된 URL 필요)

### Usage Guidelines

#### 1. 이미지 업로드 구현
```typescript
import ProfileImageUpload from '@/app/components/media/ProfileImageUpload';

// 사용 예시
<ProfileImageUpload
  currentImageId={user.profileImageId}
  onUploadComplete={(imageId) => {
    // DB에 imageId 저장
    updateUserProfile({ profileImageId: imageId });
  }}
/>
```

#### 2. 이미지 표시
```typescript
import ProfileImagePreview from '@/app/components/media/ProfileImagePreview';

// 사용 예시
<ProfileImagePreview
  imageId={user.profileImageId}
  variant="avatar"
  size="lg"
  fallback={<DefaultAvatar />}
/>
```

#### 3. 비디오 업로드
```typescript
import VideoUploader from '@/app/components/media/VideoUploader';

// PT 기록 비디오 업로드
<VideoUploader
  entityType="pt-record"
  entityId={ptRecordId}
  onUploadComplete={(videoId) => {
    // 업로드 완료 처리
  }}
  maxDurationSeconds={600}
  useTus={true} // 대용량 파일용
/>
```

#### 4. 미디어 갤러리
```typescript
import MediaGallery from '@/app/components/media/MediaGallery';

// PT 기록의 모든 미디어 표시
<MediaGallery
  entityType="pt-record"
  entityId={ptRecordId}
  allowDelete={isTrainer}
  onSelect={(item) => {
    // 선택된 미디어 처리
  }}
/>
```

### Security Considerations

1. **권한 검증**: 모든 API 엔드포인트에서 세션 기반 권한 확인
2. **메타데이터 검증**: userId가 현재 세션과 일치하는지 확인
3. **역할 기반 제한**: PT 기록은 트레이너만, 프로필은 본인만
4. **서명된 URL**: 민감한 컨텐츠는 requireSignedURLs 옵션 사용

### Media Upload/Delete Principles (중요)

미디어 업로드와 삭제는 항상 **Cloudflare를 먼저 처리**하고, 성공한 경우에만 DB를 업데이트합니다:

#### Upload Flow
1. Cloudflare에 Direct Upload URL 생성
2. 클라이언트가 Cloudflare로 직접 업로드
3. 업로드 성공 확인 후 DB에 레코드 생성
4. 실패 시 Cloudflare의 이미지/비디오는 자동 정리됨

#### Delete Flow
1. DB에서 미디어 정보 조회 및 권한 확인
2. **Cloudflare에서 먼저 삭제 시도**
3. Cloudflare 삭제 성공 시 DB에서 삭제 (소프트 삭제)
4. 404 에러는 이미 삭제된 것으로 간주하고 정상 처리

#### 일관성 원칙
- **Cloudflare = Single Source of Truth**
- DB는 Cloudflare의 상태를 반영
- 불일치 발생 시 Cloudflare 상태를 우선시
- 배치 작업으로 주기적 동기화 검토

### Environment Variables

필수 환경 변수:
```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL=https://imagedelivery.net
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH=your_account_hash
```

### Error Handling

모든 컴포넌트는 일관된 에러 처리:
- 파일 검증 실패 시 toast 메시지
- 업로드 실패 시 재시도 옵션
- 네트워크 에러 시 사용자 친화적 메시지

### Performance Optimization

1. **이미지 최적화**: Cloudflare가 자동으로 WebP 변환 및 크기 최적화
2. **레이지 로딩**: 갤러리에서 viewport 내 이미지만 로드
3. **캐싱**: React Query로 미디어 목록 캐싱
4. **청크 업로드**: TUS 프로토콜로 대용량 비디오 안정적 업로드

### Git Integration Patterns

- Clear commit messages with business context
- Feature branch workflow for complex changes
- Progressive commits for iterative development
- Proper merge strategies for collaboration

This architecture supports a complex fitness center management system with multi-role access, real-time communication, detailed workout tracking, and comprehensive business management features.

## Sentry Error Monitoring

### Overview

Sentry is integrated for comprehensive error tracking, performance monitoring, and debugging. The integration follows the official Sentry Next.js SDK patterns with customizations for our application structure.

### Configuration Files

- **sentry.server.config.ts**: Server-side configuration
- **sentry.edge.config.ts**: Edge runtime configuration  
- **sentry.client.config.ts**: Client-side configuration
- **instrumentation.ts**: Application instrumentation hooks

### Best Practices and Usage Guidelines

#### Exception Catching

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
import { ErrorContexts } from "@/app/lib/utils/error-contexts";

try {
  // Your code
} catch (error) {
  await ErrorReporter.report(error, {
    action: "user-action",
    metadata: {
      description: ErrorContexts.PT_SCHEDULE_CREATE, // Korean context
      // additional metadata
    }
  });
}
```

#### Performance Tracing

```typescript
import { trackUIAction, trackAPICall, trackDBQuery } from "@/app/lib/utils/error-reporter";
import * as Sentry from "@sentry/nextjs";

// UI click tracking with our helper
function MyComponent() {
  const fetchData = async () => {
    return trackUIAction(
      "MyComponent",
      "button#fetch-data",
      async () => {
        const res = await fetch("/api/data");
        return res.json();
      },
      { userId: "123" } // optional metadata
    );
  };
}

// API tracking in route handlers
export async function GET(request: Request) {
  return trackAPICall(
    "/api/data",
    "GET",
    async () => {
      const data = await getData();
      return NextResponse.json(data);
    },
    { source: "api-route" }
  );
}

// Database query tracking
const getMemberProfile = async (userId: string) => {
  return trackDBQuery(
    "findUnique",
    "member",
    async () => {
      return prisma.member.findUnique({
        where: { userId },
        select: { /* fields */ }
      });
    },
    { userId }
  );
};

// Direct Sentry.startSpan usage for custom operations
function customOperation() {
  return Sentry.startSpan(
    {
      name: "custom_task",
      op: "task",
      attributes: {
        "task.type": "data-processing",
        "task.size": "large",
      },
    },
    async () => {
      // Your custom logic here
    }
  );
}
```

#### Logging with Sentry

```typescript
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

// Using ErrorReporter logging methods
ErrorReporter.debug("Debug information", { userId: "123" });
ErrorReporter.info("User logged in", { username: "user@example.com" });
ErrorReporter.warning("API rate limit approaching", { remaining: 10 });
ErrorReporter.error("Failed to process payment", { orderId: "abc123" });

// Logging is automatically sent to Sentry and console (in dev)
```

### Sentry Integration Patterns

#### 1. Error Context Management

All errors should include Korean language descriptions for business context:

```typescript
// Use predefined contexts from error-contexts.ts
import { ErrorContexts } from "@/app/lib/utils/error-contexts";

ErrorReporter.report(error, {
  action: "createPTSchedule",
  metadata: {
    description: ErrorContexts.PT_SCHEDULE_CREATE,
    // "회원이 새로운 PT 신청 중 스케줄 등록에서 오류 발생"
  }
});
```

#### 2. User Session Integration

User context is automatically set during login/logout:

```typescript
// Automatically handled in socialLogin.ts
ErrorReporter.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: userRole,
});
```

#### 3. Sensitive Data Filtering

Sensitive data is automatically filtered:
- Cookies are redacted
- Authorization headers are removed
- Form data with sensitive field names is masked

#### 4. Environment-Based Configuration

```typescript
// Development: Full debugging, 100% trace sampling
// Production: 10% trace sampling, no debug output
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

### API Route Error Handling Pattern

```typescript
import { ErrorReporter } from "@/app/lib/utils/error-reporter";
import { ErrorContexts } from "@/app/lib/utils/error-contexts";

export async function GET(request: Request) {
  let session;
  try {
    session = await getSession();
    if (!session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await service.getData(session.id);
    return NextResponse.json(data);
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "api-get-data",
      userId: session?.id,
      metadata: {
        description: ErrorContexts.DATA_FETCH,
        endpoint: request.url,
      }
    });
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
```

### Client Component Error Handling

```typescript
import { ErrorReporter } from "@/app/lib/utils/error-reporter";
import { ErrorContexts } from "@/app/lib/utils/error-contexts";

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      // Success handling
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "form-submit",
        metadata: {
          description: ErrorContexts.FORM_SUBMIT,
          formType: "myForm",
        }
      });
      // Show user-friendly error message
    } finally {
      setIsLoading(false);
    }
  };
}
```

### Testing Sentry Integration

1. **Test Page**: `/test-sentry` - Comprehensive test scenarios
2. **Test Checklist**: `SENTRY_TEST_CHECKLIST.md` - Validation guide
3. **Sentry Example**: `/sentry-example-page` - Official Sentry test page

### Environment Variables for Sentry

```env
# Required
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_auth_token

# Optional
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development|staging|production
SENTRY_LOG_LEVEL=debug|info|warning|error
```

### Common Error Contexts

The system includes 70+ predefined Korean error contexts covering:
- Authentication & Login
- PT Scheduling & Records
- Member Management
- Payment Processing
- File Uploads
- Chat Operations
- Data Operations

Refer to `app/lib/utils/error-contexts.ts` for the complete list.

### Performance Monitoring Best Practices

1. **Use Sentry.startSpan** for tracking operations:
   - UI interactions (clicks, form submissions)
   - API calls
   - Database queries
   - External service calls

2. **Set meaningful operation names**:
   - `ui.action.click` for user interactions
   - `http.client` for API calls
   - `db.query` for database operations

3. **Include relevant attributes**:
   - Component names
   - Endpoint URLs
   - User actions
   - Business context

### Migration Notes

When updating error handling in existing code:
1. Replace `console.error` with `ErrorReporter.report`
2. Add appropriate Korean context from `ErrorContexts`
3. Include relevant metadata (userId, action, etc.)
4. For performance tracking:
   - UI interactions: use `trackUIAction`
   - API calls: use `trackAPICall`
   - Database queries: use `trackDBQuery`
   - Custom operations: use `Sentry.startSpan` directly
5. Replace `console.log/warn/error` with `ErrorReporter.info/warning/error` for important logs
6. Ensure sensitive data is not included in error reports

### Key Differences from Direct Sentry Usage

1. **Simplified API**: Helper functions abstract common patterns
2. **Automatic Error Handling**: Errors in spans are automatically reported with context
3. **Korean Context**: Built-in support for Korean error descriptions
4. **Type Safety**: Strongly typed interfaces for all operations
5. **Consistent Metadata**: Standardized metadata structure across all tracking
