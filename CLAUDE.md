# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Start the Next.js development server
- **Build**: `npm run build` - Build the application for production
- **Production server**: `npm run start` - Start the production server
- **Linting**: `npm run lint` - Run ESLint to check code quality

## Database Commands

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
- **State Management**: SWR for data fetching and React Query for server state
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

### Key Service Architecture

**Authentication & Sessions**:
- Session management in `app/lib/session.ts`
- Social login support (Kakao, Naver) in `app/lib/socialLogin.ts`
- Role-based middleware in `middleware.ts`

**Media Management**:
- Unified media system supporting images and videos
- Automatic cleanup and storage management
- Usage tracking per user with limits

**Database Schema Highlights**:
- Complex relationship between Users, Trainers, Members, and Managers
- PT system with scheduling, records, and payment tracking
- Flexible media system supporting multiple entity types
- Rate limiting and logging for API security

### File Organization Patterns

**API Routes**: 
- Organized by user role (`/api/member/`, `/api/trainer/`, `/api/manager/`)
- RESTful patterns with clear resource boundaries
- Common utilities in `/api/common/`

**Components**:
- Role-specific component directories (`components/member/`, `components/trainer/`)
- Shared UI components in `components/ui/`
- Business logic components organized by feature

**Services**:
- Business logic abstracted into service layers (`app/lib/services/`)
- Database operations centralized in service files
- Clear separation between API routes and business logic

### State Management Patterns
- SWR for client-side data fetching and caching
- React Query for complex server state management
- Form state managed with React Hook Form
- Session state through Iron Session with secure cookies

### Development Workflow from Cursor Rules

**Task-Driven Development Process**:
1. **Analyze Current State**: Examine existing code, identify patterns, understand context
2. **Plan Implementation**: Break down into concrete, executable tasks
3. **Iterative Development**: Implement one task at a time with verification
4. **Validate Integration**: Ensure changes work with existing systems
5. **Document Progress**: Log changes and maintain consistency

**Task Management Principles**:
- Create specific, testable subtasks
- Implement incrementally with frequent validation  
- Maintain backwards compatibility
- Follow established patterns and conventions
- Use tagged workflows for complex changes

**Code Analysis Techniques**:
- Examine file structure and naming conventions
- Understand data flow and state management
- Review API patterns and error handling
- Analyze component hierarchy and prop patterns
- Study database schema relationships

**Implementation Best Practices**:
- Follow existing code style and patterns
- Maintain consistent error handling
- Ensure proper type safety with TypeScript
- Test critical paths before proceeding
- Document complex business logic

**Model Configuration Management**:
- Use research tool for complex analysis
- Configure models based on task complexity
- Leverage context-aware code generation
- Maintain consistency across implementations

**Git Integration Patterns**:
- Clear commit messages with business context
- Feature branch workflow for complex changes
- Progressive commits for iterative development
- Proper merge strategies for collaboration

**Rule Structure and Maintenance**:
- Create focused, single-purpose rules
- Include specific file references and examples
- Regularly review and update for project evolution
- Maintain consistency with project patterns

This architecture supports a complex fitness center management system with multi-role access, real-time communication, detailed workout tracking, and comprehensive business management features.