-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'TRAINER', 'MANAGER');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "MemberLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PtState" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'FINISHED', 'REFUNDED', 'ACCEPTING', 'PAUSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScheduleChangeState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('MACHINE', 'FREE', 'STRETCHING');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_ITEM', 'UPDATE_ITEM', 'DELETE_ITEM', 'CREATE_RECORD', 'UPDATE_RECORD');

-- CreateEnum
CREATE TYPE "ScheduleState" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('PROFILE', 'MACHINE', 'CENTER', 'FREE_EXERCISE', 'STRETCHING', 'LESSON', 'BEFORE_AFTER', 'ACHIEVEMENT', 'CONDITION', 'EQUIPMENT', 'EVENT', 'SIGNATURE', 'ETC', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('MACHINE', 'EXERCISE_DEMO', 'LESSON', 'FORM_CHECK', 'PROGRESS', 'INSTRUCTION', 'FREE_EXERCISE', 'STRETCHING');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'DELETED');

-- CreateEnum
CREATE TYPE "ErrorLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('NEW', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ErrorEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "realname" TEXT,
    "realnameConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "naverId" TEXT,
    "kakaoId" TEXT,
    "mobile" TEXT,
    "avatarImageId" UUID,
    "usernameChangeCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsernameChangeAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "deletedAt" TIMESTAMP(3),
    "isPremiumUser" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserData" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "UserData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "fitnessCenterId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "memberLevel" "MemberLevel" NOT NULL DEFAULT 'BRONZE',

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dayOfWeek" "WeekDay" NOT NULL,
    "openTime" INTEGER NOT NULL,
    "closeTime" INTEGER NOT NULL,

    CONSTRAINT "WorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerLevel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,

    CONSTRAINT "TrainerLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtProductTrainerLevel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptProductId" UUID NOT NULL,
    "trainerLevelId" UUID NOT NULL,
    "incentiveRate" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtProductTrainerLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "introduce" TEXT NOT NULL DEFAULT '안녕하세요',
    "levelId" UUID,
    "groupId" UUID,
    "fitnessCenterId" UUID,
    "working" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" UUID NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationValue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "etc" TEXT NOT NULL,

    CONSTRAINT "ConfigurationValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "expiration_period" INTEGER NOT NULL,
    "incentivePercent" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "time" INTEGER NOT NULL DEFAULT 60,
    "onSale" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '2199-12-31 23:59:59',

    CONSTRAINT "PtProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtChangeInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ptId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changeAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),

    CONSTRAINT "PtChangeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptProductId" UUID NOT NULL,
    "memberId" UUID,
    "trainerId" UUID,
    "state" "PtState" NOT NULL DEFAULT 'PENDING',
    "stateUpdatedAt" TIMESTAMP(3),
    "description" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "expirationDate" TIMESTAMP(3),
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Pt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtPause" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "PtPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "deduction" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID NOT NULL,
    "fitnessCenterId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "isCanceled" BOOLEAN NOT NULL DEFAULT false,
    "managerCheckedAt" TIMESTAMP(3),
    "managerId" UUID,
    "conditionMemo" TEXT,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lessonId" UUID NOT NULL,
    "entry" INTEGER NOT NULL,
    "description" TEXT,
    "type" "RecordType" NOT NULL,
    "title" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedUserId" UUID,

    CONSTRAINT "LessonRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChangeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lessonId" UUID NOT NULL,
    "requestorId" UUID NOT NULL,
    "requestedStartAt" TIMESTAMP(3),
    "originalStratAt" TIMESTAMP(3) NOT NULL,
    "state" "ScheduleChangeState" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "responderId" UUID,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineBrand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "model" TEXT,
    "description" TEXT NOT NULL,
    "spec" TEXT,
    "musclesUsed" TEXT,
    "fitnessCenterId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSetting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "machineId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "MachineSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSettingValue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "machineSettingId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "MachineSettingValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reps" INTEGER NOT NULL,
    "set" INTEGER NOT NULL,
    "lessonRecordId" UUID NOT NULL,

    CONSTRAINT "MachineSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "fitnessCenterId" UUID,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeExercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FreeExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freeExerciseId" UUID NOT NULL,
    "reps" INTEGER NOT NULL,
    "set" INTEGER NOT NULL,
    "lessonRecordId" UUID NOT NULL,

    CONSTRAINT "FreeSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingExercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "StretchingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingExerciseRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stretchingExerciseId" UUID NOT NULL,
    "description" TEXT,
    "lessonRecordId" UUID NOT NULL,

    CONSTRAINT "StretchingExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeSetEquipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freeSetRecordId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "value" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FreeSetEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingEquipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stretchingExerciseRecordId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "value" TEXT,
    "notes" TEXT,

    CONSTRAINT "StretchingEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "onSale" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "memberId" UUID NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "totalDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "membershipProductId" UUID NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffDay" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fitnessCenterId" UUID,

    CONSTRAINT "OffDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerOff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "trainerId" UUID NOT NULL,
    "managerId" UUID,
    "stateUpdatedAt" TIMESTAMP(3),
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,

    CONSTRAINT "TrainerOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessCenter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT NOT NULL,
    "postCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inOperation" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FitnessCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dayOfWeek" "WeekDay" NOT NULL,
    "openTime" INTEGER NOT NULL,
    "closeTime" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpeningHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userId" UUID,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userOneId" UUID NOT NULL,
    "userTwoId" UUID NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" UUID NOT NULL,
    "senderId" UUID,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cloudflareId" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" UUID NOT NULL,
    "machineId" UUID,
    "fitnessCenterId" UUID,
    "lessonId" UUID,
    "equipmentId" UUID,
    "freeExerciseId" UUID,
    "stretchingExerciseId" UUID,
    "lessonConditionId" UUID,
    "ptId" UUID,
    "metadata" JSONB,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "streamId" TEXT NOT NULL,
    "type" "VideoType" NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
    "uploadedById" UUID NOT NULL,
    "lessonId" UUID,
    "machineId" UUID,
    "stretchingId" UUID,
    "freeExerciseId" UUID,
    "metadata" JSONB,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "imageStorageBytes" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "videoMinutes" INTEGER NOT NULL DEFAULT 0,
    "videoStorageBytes" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainerId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "lessonRecordId" UUID,
    "action" "AuditAction" NOT NULL,
    "actionDetails" JSONB,
    "scheduledTime" TIMESTAMP(3),
    "isOutOfTime" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,

    CONSTRAINT "LessonAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurvey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "options" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "signatureImageId" UUID,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyQuestionResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "responseId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemError" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" "ErrorLevel" NOT NULL DEFAULT 'ERROR',
    "status" "ErrorStatus" NOT NULL DEFAULT 'NEW',
    "environment" "ErrorEnvironment" NOT NULL,
    "message" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorType" TEXT,
    "stackTrace" TEXT,
    "userId" UUID,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "method" TEXT,
    "url" TEXT,
    "endpoint" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "assignedTo" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "lastOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fingerprint" TEXT,

    CONSTRAINT "SystemError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[],
    "changedBy" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL,
    "changedByName" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrainerToWorkingHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TrainerToWorkingHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MachineSetRecordToMachineSettingValue" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MachineSetRecordToMachineSettingValue_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FitnessCenterToOpeningHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToOpeningHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FitnessCenterToWorkingHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToWorkingHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FitnessCenterToManager" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToManager_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_naverId_key" ON "User"("naverId");

-- CreateIndex
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarImageId_key" ON "User"("avatarImageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserData_userId_key" ON "UserData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHour_dayOfWeek_openTime_closeTime_key" ON "WorkingHour"("dayOfWeek", "openTime", "closeTime");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerLevel_title_key" ON "TrainerLevel"("title");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerLevel_displayTitle_key" ON "TrainerLevel"("displayTitle");

-- CreateIndex
CREATE INDEX "PtProductTrainerLevel_ptProductId_idx" ON "PtProductTrainerLevel"("ptProductId");

-- CreateIndex
CREATE INDEX "PtProductTrainerLevel_trainerLevelId_idx" ON "PtProductTrainerLevel"("trainerLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "PtProductTrainerLevel_ptProductId_trainerLevelId_key" ON "PtProductTrainerLevel"("ptProductId", "trainerLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_userId_key" ON "Trainer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_userId_key" ON "Manager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PtChangeInfo_ptId_key" ON "PtChangeInfo"("ptId");

-- CreateIndex
CREATE INDEX "PtPause_ptId_isActive_idx" ON "PtPause"("ptId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PtPayment_ptId_key" ON "PtPayment"("ptId");

-- CreateIndex
CREATE INDEX "Lesson_scheduledAt_idx" ON "Lesson"("scheduledAt");

-- CreateIndex
CREATE INDEX "Lesson_ptId_scheduledAt_idx" ON "Lesson"("ptId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_lessonId_idx" ON "ScheduleChangeRequest"("lessonId");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_state_idx" ON "ScheduleChangeRequest"("state");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_expiresAt_idx" ON "ScheduleChangeRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MachineBrand_name_key" ON "MachineBrand"("name");

-- CreateIndex
CREATE INDEX "MachineBrand_name_idx" ON "MachineBrand"("name");

-- CreateIndex
CREATE INDEX "Machine_brandId_idx" ON "Machine"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_title_key" ON "Equipment"("title");

-- CreateIndex
CREATE INDEX "Equipment_fitnessCenterId_idx" ON "Equipment"("fitnessCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_title_unit_fitnessCenterId_key" ON "Equipment"("title", "unit", "fitnessCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "FreeExercise_title_key" ON "FreeExercise"("title");

-- CreateIndex
CREATE UNIQUE INDEX "StretchingExercise_title_key" ON "StretchingExercise"("title");

-- CreateIndex
CREATE INDEX "FreeSetEquipment_freeSetRecordId_idx" ON "FreeSetEquipment"("freeSetRecordId");

-- CreateIndex
CREATE INDEX "FreeSetEquipment_equipmentId_idx" ON "FreeSetEquipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FreeSetEquipment_freeSetRecordId_equipmentId_value_key" ON "FreeSetEquipment"("freeSetRecordId", "equipmentId", "value");

-- CreateIndex
CREATE INDEX "StretchingEquipment_stretchingExerciseRecordId_idx" ON "StretchingEquipment"("stretchingExerciseRecordId");

-- CreateIndex
CREATE INDEX "StretchingEquipment_equipmentId_idx" ON "StretchingEquipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StretchingEquipment_stretchingExerciseRecordId_equipmentId_key" ON "StretchingEquipment"("stretchingExerciseRecordId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipProduct_title_key" ON "MembershipProduct"("title");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_dayOfWeek_openTime_closeTime_isClosed_key" ON "OpeningHour"("dayOfWeek", "openTime", "closeTime", "isClosed");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_ip_userId_key" ON "RateLimit"("ip", "userId");

-- CreateIndex
CREATE INDEX "ChatRoom_userOneId_idx" ON "ChatRoom"("userOneId");

-- CreateIndex
CREATE INDEX "ChatRoom_userTwoId_idx" ON "ChatRoom"("userTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_userOneId_userTwoId_key" ON "ChatRoom"("userOneId", "userTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_cloudflareId_key" ON "Image"("cloudflareId");

-- CreateIndex
CREATE INDEX "Image_uploadedById_idx" ON "Image"("uploadedById");

-- CreateIndex
CREATE INDEX "Image_type_idx" ON "Image"("type");

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

-- CreateIndex
CREATE INDEX "Image_cloudflareId_idx" ON "Image"("cloudflareId");

-- CreateIndex
CREATE INDEX "Image_machineId_isPrimary_idx" ON "Image"("machineId", "isPrimary");

-- CreateIndex
CREATE INDEX "Image_fitnessCenterId_isPrimary_idx" ON "Image"("fitnessCenterId", "isPrimary");

-- CreateIndex
CREATE INDEX "Image_lessonId_isPrimary_idx" ON "Image"("lessonId", "isPrimary");

-- CreateIndex
CREATE INDEX "Image_equipmentId_isPrimary_idx" ON "Image"("equipmentId", "isPrimary");

-- CreateIndex
CREATE INDEX "Image_freeExerciseId_isPrimary_idx" ON "Image"("freeExerciseId", "isPrimary");

-- CreateIndex
CREATE INDEX "Image_stretchingExerciseId_isPrimary_idx" ON "Image"("stretchingExerciseId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Video_streamId_key" ON "Video"("streamId");

-- CreateIndex
CREATE INDEX "Video_uploadedById_idx" ON "Video"("uploadedById");

-- CreateIndex
CREATE INDEX "Video_type_idx" ON "Video"("type");

-- CreateIndex
CREATE INDEX "Video_status_idx" ON "Video"("status");

-- CreateIndex
CREATE INDEX "Video_streamId_idx" ON "Video"("streamId");

-- CreateIndex
CREATE INDEX "MediaUsage_month_idx" ON "MediaUsage"("month");

-- CreateIndex
CREATE INDEX "MediaUsage_userId_idx" ON "MediaUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_userId_month_key" ON "MediaUsage"("userId", "month");

-- CreateIndex
CREATE INDEX "LessonAuditLog_trainerId_idx" ON "LessonAuditLog"("trainerId");

-- CreateIndex
CREATE INDEX "LessonAuditLog_lessonId_idx" ON "LessonAuditLog"("lessonId");

-- CreateIndex
CREATE INDEX "LessonAuditLog_action_idx" ON "LessonAuditLog"("action");

-- CreateIndex
CREATE INDEX "LessonAuditLog_isOutOfTime_idx" ON "LessonAuditLog"("isOutOfTime");

-- CreateIndex
CREATE INDEX "LessonAuditLog_createdAt_idx" ON "LessonAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PtSurveyQuestion_surveyId_idx" ON "PtSurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX "PtSurveyQuestion_order_idx" ON "PtSurveyQuestion"("order");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_surveyId_idx" ON "PtSurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_memberId_idx" ON "PtSurveyResponse"("memberId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_trainerId_idx" ON "PtSurveyResponse"("trainerId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_completedAt_idx" ON "PtSurveyResponse"("completedAt");

-- CreateIndex
CREATE INDEX "PtSurveyQuestionResponse_responseId_idx" ON "PtSurveyQuestionResponse"("responseId");

-- CreateIndex
CREATE INDEX "PtSurveyQuestionResponse_questionId_idx" ON "PtSurveyQuestionResponse"("questionId");

-- CreateIndex
CREATE INDEX "SystemError_level_status_idx" ON "SystemError"("level", "status");

-- CreateIndex
CREATE INDEX "SystemError_createdAt_idx" ON "SystemError"("createdAt");

-- CreateIndex
CREATE INDEX "SystemError_userId_idx" ON "SystemError"("userId");

-- CreateIndex
CREATE INDEX "SystemError_environment_idx" ON "SystemError"("environment");

-- CreateIndex
CREATE INDEX "SystemError_fingerprint_idx" ON "SystemError"("fingerprint");

-- CreateIndex
CREATE INDEX "SystemError_tags_idx" ON "SystemError"("tags");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_recordId_idx" ON "AuditLog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_changedBy_idx" ON "AuditLog"("changedBy");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tableName_createdAt_idx" ON "AuditLog"("tableName", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tags_idx" ON "AuditLog"("tags");

-- CreateIndex
CREATE INDEX "_TrainerToWorkingHour_B_index" ON "_TrainerToWorkingHour"("B");

-- CreateIndex
CREATE INDEX "_MachineSetRecordToMachineSettingValue_B_index" ON "_MachineSetRecordToMachineSettingValue"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToOpeningHour_B_index" ON "_FitnessCenterToOpeningHour"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToWorkingHour_B_index" ON "_FitnessCenterToWorkingHour"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToManager_B_index" ON "_FitnessCenterToManager"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserData" ADD CONSTRAINT "UserData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtProductTrainerLevel" ADD CONSTRAINT "PtProductTrainerLevel_ptProductId_fkey" FOREIGN KEY ("ptProductId") REFERENCES "PtProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtProductTrainerLevel" ADD CONSTRAINT "PtProductTrainerLevel_trainerLevelId_fkey" FOREIGN KEY ("trainerLevelId") REFERENCES "TrainerLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "TrainerLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtChangeInfo" ADD CONSTRAINT "PtChangeInfo_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_ptProductId_fkey" FOREIGN KEY ("ptProductId") REFERENCES "PtProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtPause" ADD CONSTRAINT "PtPause_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtPayment" ADD CONSTRAINT "PtPayment_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRecord" ADD CONSTRAINT "LessonRecord_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "MachineBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetting" ADD CONSTRAINT "MachineSetting_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSettingValue" ADD CONSTRAINT "MachineSettingValue_machineSettingId_fkey" FOREIGN KEY ("machineSettingId") REFERENCES "MachineSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetRecord" ADD CONSTRAINT "MachineSetRecord_lessonRecordId_fkey" FOREIGN KEY ("lessonRecordId") REFERENCES "LessonRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_lessonRecordId_fkey" FOREIGN KEY ("lessonRecordId") REFERENCES "LessonRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_lessonRecordId_fkey" FOREIGN KEY ("lessonRecordId") REFERENCES "LessonRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetEquipment" ADD CONSTRAINT "FreeSetEquipment_freeSetRecordId_fkey" FOREIGN KEY ("freeSetRecordId") REFERENCES "FreeSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetEquipment" ADD CONSTRAINT "FreeSetEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingEquipment" ADD CONSTRAINT "StretchingEquipment_stretchingExerciseRecordId_fkey" FOREIGN KEY ("stretchingExerciseRecordId") REFERENCES "StretchingExerciseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingEquipment" ADD CONSTRAINT "StretchingEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_membershipProductId_fkey" FOREIGN KEY ("membershipProductId") REFERENCES "MembershipProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffDay" ADD CONSTRAINT "OffDay_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerOff" ADD CONSTRAINT "TrainerOff_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerOff" ADD CONSTRAINT "TrainerOff_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_lessonConditionId_fkey" FOREIGN KEY ("lessonConditionId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_stretchingId_fkey" FOREIGN KEY ("stretchingId") REFERENCES "StretchingExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAuditLog" ADD CONSTRAINT "LessonAuditLog_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAuditLog" ADD CONSTRAINT "LessonAuditLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyQuestion" ADD CONSTRAINT "PtSurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PtSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PtSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_signatureImageId_fkey" FOREIGN KEY ("signatureImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyQuestionResponse" ADD CONSTRAINT "PtSurveyQuestionResponse_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PtSurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyQuestionResponse" ADD CONSTRAINT "PtSurveyQuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PtSurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemError" ADD CONSTRAINT "SystemError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_A_fkey" FOREIGN KEY ("A") REFERENCES "MachineSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_B_fkey" FOREIGN KEY ("B") REFERENCES "MachineSettingValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_B_fkey" FOREIGN KEY ("B") REFERENCES "OpeningHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToManager" ADD CONSTRAINT "_FitnessCenterToManager_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToManager" ADD CONSTRAINT "_FitnessCenterToManager_B_fkey" FOREIGN KEY ("B") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
