-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'TRAINER', 'MANAGER');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "PtState" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'FINISHED');

-- CreateEnum
CREATE TYPE "ScheduleChangeState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('MACHINE', 'FREE', 'STRETCHING');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('WEIGHT', 'CARDIO', 'RESISTANCE', 'FUNCTIONAL', 'ACCESSORY', 'MOBILITY', 'CORE', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "ScheduleState" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CARD', 'CASH', 'POINT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('PROFILE', 'MACHINE', 'CENTER', 'EXERCISE', 'STRETCHING', 'PT_RECORD', 'BEFORE_AFTER', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('EXERCISE_DEMO', 'PT_RECORD', 'FORM_CHECK', 'PROGRESS', 'INSTRUCTION');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "naverId" TEXT,
    "kakaoId" TEXT,
    "mobile" TEXT NOT NULL,
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
CREATE TABLE "Trainer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "introduce" TEXT NOT NULL DEFAULT '안녕하세요',
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
    "fitnessCenterId" UUID,

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
    "description" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "time" INTEGER NOT NULL DEFAULT 60,
    "onSale" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '2199-12-31 23:59:59',

    CONSTRAINT "PtProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtRejectInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ptId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,

    CONSTRAINT "PtRejectInfo_pkey" PRIMARY KEY ("id")
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
    "trainerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "isRegular" BOOLEAN NOT NULL,

    CONSTRAINT "Pt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtScheduleChangeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptRecordId" UUID NOT NULL,
    "requestorId" UUID NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "requestedStartTime" INTEGER NOT NULL,
    "requestedEndTime" INTEGER NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "originalStartTime" INTEGER NOT NULL,
    "originalEndTime" INTEGER NOT NULL,
    "state" "ScheduleChangeState" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "responderId" UUID,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID NOT NULL,
    "ptScheduleId" UUID NOT NULL,
    "fitnessCenterId" UUID NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtRecordItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptRecordId" UUID NOT NULL,
    "entry" INTEGER NOT NULL,
    "description" TEXT,
    "type" "RecordType" NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PtRecordItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "fitnessCenterId" UUID,

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
    "ptRecordItemId" UUID NOT NULL,

    CONSTRAINT "MachineSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "primaryValue" DOUBLE PRECISION,
    "primaryUnit" TEXT,
    "secondaryValue" DOUBLE PRECISION,
    "secondaryUnit" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
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
    "ptRecordItemId" UUID NOT NULL,

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
    "ptRecordItemId" UUID NOT NULL,

    CONSTRAINT "StretchingExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,

    CONSTRAINT "PtSchedule_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MembershipAddedDay" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuerId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "dayCount" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "MembershipAddedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "membershipId" UUID,
    "nictTid" TEXT,
    "paidAt" TIMESTAMP(3),
    "price" INTEGER NOT NULL,

    CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID,
    "type" "PaymentType" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,

    CONSTRAINT "PtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtCoupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issuerId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "ptId" UUID NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 10,
    "maxPrice" INTEGER NOT NULL DEFAULT 100000,
    "onValid" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + '30 days'::interval),

    CONSTRAINT "PtCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCoupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issuerId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 10,
    "maxPrice" INTEGER NOT NULL DEFAULT 100000,
    "onValid" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + '30 days'::interval),
    "membershipId" UUID,

    CONSTRAINT "MembershipCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogNicePay" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tid" TEXT NOT NULL,
    "userDataId" UUID NOT NULL,

    CONSTRAINT "LogNicePay_pkey" PRIMARY KEY ("id")
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
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "trainerId" UUID NOT NULL,

    CONSTRAINT "TrainerOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessCenter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
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
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" "ImageType" NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedById" UUID NOT NULL,
    "machineId" UUID,
    "fitnessCenterId" UUID,
    "ptRecordItemId" UUID,
    "equipmentId" UUID,
    "freeExerciseId" UUID,
    "stretchingExerciseId" UUID,
    "metadata" JSONB,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "streamId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "resolution" TEXT,
    "type" "VideoType" NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
    "uploadedById" UUID NOT NULL,
    "ptRecordItemId" UUID,
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
CREATE TABLE "_TrainerToWorkingHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TrainerToWorkingHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PtProductToTrainer" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PtProductToTrainer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MachineSetRecordToMachineSettingValue" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MachineSetRecordToMachineSettingValue_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EquipmentToFreeSetRecord" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_EquipmentToFreeSetRecord_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EquipmentToStretchingExerciseRecord" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_EquipmentToStretchingExerciseRecord_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "Trainer_userId_key" ON "Trainer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_userId_key" ON "Manager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PtRejectInfo_ptId_key" ON "PtRejectInfo"("ptId");

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_ptRecordId_idx" ON "PtScheduleChangeRequest"("ptRecordId");

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_state_idx" ON "PtScheduleChangeRequest"("state");

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_expiresAt_idx" ON "PtScheduleChangeRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "Equipment_fitnessCenterId_category_idx" ON "Equipment"("fitnessCenterId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PtSchedule_date_startTime_endTime_key" ON "PtSchedule"("date", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipProduct_title_key" ON "MembershipProduct"("title");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPayment_membershipId_key" ON "MembershipPayment"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "PtPayment_ptId_key" ON "PtPayment"("ptId");

-- CreateIndex
CREATE UNIQUE INDEX "PtCoupon_ptId_key" ON "PtCoupon"("ptId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCoupon_membershipId_key" ON "MembershipCoupon"("membershipId");

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
CREATE INDEX "_TrainerToWorkingHour_B_index" ON "_TrainerToWorkingHour"("B");

-- CreateIndex
CREATE INDEX "_PtProductToTrainer_B_index" ON "_PtProductToTrainer"("B");

-- CreateIndex
CREATE INDEX "_MachineSetRecordToMachineSettingValue_B_index" ON "_MachineSetRecordToMachineSettingValue"("B");

-- CreateIndex
CREATE INDEX "_EquipmentToFreeSetRecord_B_index" ON "_EquipmentToFreeSetRecord"("B");

-- CreateIndex
CREATE INDEX "_EquipmentToStretchingExerciseRecord_B_index" ON "_EquipmentToStretchingExerciseRecord"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToOpeningHour_B_index" ON "_FitnessCenterToOpeningHour"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToWorkingHour_B_index" ON "_FitnessCenterToWorkingHour"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserData" ADD CONSTRAINT "UserData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRejectInfo" ADD CONSTRAINT "PtRejectInfo_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_ptProductId_fkey" FOREIGN KEY ("ptProductId") REFERENCES "PtProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_ptScheduleId_fkey" FOREIGN KEY ("ptScheduleId") REFERENCES "PtSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetting" ADD CONSTRAINT "MachineSetting_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSettingValue" ADD CONSTRAINT "MachineSettingValue_machineSettingId_fkey" FOREIGN KEY ("machineSettingId") REFERENCES "MachineSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetRecord" ADD CONSTRAINT "MachineSetRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_membershipProductId_fkey" FOREIGN KEY ("membershipProductId") REFERENCES "MembershipProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAddedDay" ADD CONSTRAINT "MembershipAddedDay_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAddedDay" ADD CONSTRAINT "MembershipAddedDay_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPayment" ADD CONSTRAINT "MembershipPayment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtPayment" ADD CONSTRAINT "PtPayment_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtCoupon" ADD CONSTRAINT "PtCoupon_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtCoupon" ADD CONSTRAINT "PtCoupon_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtCoupon" ADD CONSTRAINT "PtCoupon_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtCoupon" ADD CONSTRAINT "PtCoupon_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoupon" ADD CONSTRAINT "MembershipCoupon_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoupon" ADD CONSTRAINT "MembershipCoupon_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoupon" ADD CONSTRAINT "MembershipCoupon_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoupon" ADD CONSTRAINT "MembershipCoupon_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogNicePay" ADD CONSTRAINT "LogNicePay_userDataId_fkey" FOREIGN KEY ("userDataId") REFERENCES "UserData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffDay" ADD CONSTRAINT "OffDay_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerOff" ADD CONSTRAINT "TrainerOff_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Image" ADD CONSTRAINT "Image_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PtProductToTrainer" ADD CONSTRAINT "_PtProductToTrainer_A_fkey" FOREIGN KEY ("A") REFERENCES "PtProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PtProductToTrainer" ADD CONSTRAINT "_PtProductToTrainer_B_fkey" FOREIGN KEY ("B") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_A_fkey" FOREIGN KEY ("A") REFERENCES "MachineSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_B_fkey" FOREIGN KEY ("B") REFERENCES "MachineSettingValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToFreeSetRecord" ADD CONSTRAINT "_EquipmentToFreeSetRecord_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToFreeSetRecord" ADD CONSTRAINT "_EquipmentToFreeSetRecord_B_fkey" FOREIGN KEY ("B") REFERENCES "FreeSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToStretchingExerciseRecord" ADD CONSTRAINT "_EquipmentToStretchingExerciseRecord_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToStretchingExerciseRecord" ADD CONSTRAINT "_EquipmentToStretchingExerciseRecord_B_fkey" FOREIGN KEY ("B") REFERENCES "StretchingExerciseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_B_fkey" FOREIGN KEY ("B") REFERENCES "OpeningHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
