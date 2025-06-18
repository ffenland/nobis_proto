-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'TRAINER', 'MANAGER');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "AttendanceState" AS ENUM ('ATTENDED', 'ABSENT', 'RESERVED');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('DUMBBELL', 'BARBELL', 'RESISTANCE', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleState" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

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
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "deletedAt" TIMESTAMP(3),

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

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "avatar" TEXT,
    "introduce" TEXT NOT NULL DEFAULT '안녕하세요',
    "groupId" UUID,
    "fitnessCenterId" UUID,

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
    "time" INTEGER NOT NULL DEFAULT 1,
    "onSale" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '2199-12-31 23:59:59',

    CONSTRAINT "PtProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptProductId" UUID NOT NULL,
    "memberId" UUID,
    "trainerId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "trainerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isRegular" BOOLEAN NOT NULL,

    CONSTRAINT "Pt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptId" UUID NOT NULL,
    "attended" "AttendanceState" NOT NULL DEFAULT 'RESERVED',
    "ptScheduleId" UUID NOT NULL,

    CONSTRAINT "PtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ptRecordId" UUID NOT NULL,
    "procedure" INTEGER NOT NULL,

    CONSTRAINT "RecordItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MachineRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "machineId" UUID NOT NULL,
    "memberId" UUID,
    "recordItemId" UUID,
    "freeToolId" UUID,
    "memberRecordId" UUID,

    CONSTRAINT "MachineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineRecordValue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "machineRecordId" UUID NOT NULL,
    "machineSettingValueId" UUID NOT NULL,

    CONSTRAINT "MachineRecordValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "type" "ToolType" NOT NULL,
    "hasFixedWeight" BOOLEAN NOT NULL,
    "fixedWeight" DOUBLE PRECISION,
    "description" TEXT,
    "fitnessCenterId" UUID,

    CONSTRAINT "FreeTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "toolId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "details" TEXT,
    "recordItemId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recordItemId" UUID,
    "freeToolId" UUID,

    CONSTRAINT "StretchingRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MemberRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" UUID NOT NULL,

    CONSTRAINT "MemberRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekTime" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weekDay" "WeekDay" NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "ptId" UUID,

    CONSTRAINT "WeekTime_pkey" PRIMARY KEY ("id")
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
    "nictTid" TEXT,
    "paidAt" TIMESTAMP(3),
    "price" INTEGER NOT NULL,

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
    "weekDay" "WeekDay",
    "date" TIMESTAMP(3),
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

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoomParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatRoomId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "ChatRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" UUID NOT NULL,
    "senderId" UUID,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReadStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "userId" UUID,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PtProductToTrainer" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PtProductToTrainer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FitnessCenterToOpeningHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToOpeningHour_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "UserData_userId_key" ON "UserData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_userId_key" ON "Trainer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_userId_key" ON "Manager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PtSchedule_date_startTime_endTime_key" ON "PtSchedule"("date", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "WeekTime_weekDay_startTime_endTime_key" ON "WeekTime"("weekDay", "startTime", "endTime");

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
CREATE UNIQUE INDEX "OpeningHour_dayOfWeek_openTime_closeTime_key" ON "OpeningHour"("dayOfWeek", "openTime", "closeTime");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_ip_userId_key" ON "RateLimit"("ip", "userId");

-- CreateIndex
CREATE INDEX "_PtProductToTrainer_B_index" ON "_PtProductToTrainer"("B");

-- CreateIndex
CREATE INDEX "_FitnessCenterToOpeningHour_B_index" ON "_FitnessCenterToOpeningHour"("B");

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
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_ptProductId_fkey" FOREIGN KEY ("ptProductId") REFERENCES "PtProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pt" ADD CONSTRAINT "Pt_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_ptScheduleId_fkey" FOREIGN KEY ("ptScheduleId") REFERENCES "PtSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordItem" ADD CONSTRAINT "RecordItem_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetting" ADD CONSTRAINT "MachineSetting_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSettingValue" ADD CONSTRAINT "MachineSettingValue_machineSettingId_fkey" FOREIGN KEY ("machineSettingId") REFERENCES "MachineSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecord" ADD CONSTRAINT "MachineRecord_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecord" ADD CONSTRAINT "MachineRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecord" ADD CONSTRAINT "MachineRecord_recordItemId_fkey" FOREIGN KEY ("recordItemId") REFERENCES "RecordItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecord" ADD CONSTRAINT "MachineRecord_freeToolId_fkey" FOREIGN KEY ("freeToolId") REFERENCES "FreeTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecord" ADD CONSTRAINT "MachineRecord_memberRecordId_fkey" FOREIGN KEY ("memberRecordId") REFERENCES "MemberRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecordValue" ADD CONSTRAINT "MachineRecordValue_machineRecordId_fkey" FOREIGN KEY ("machineRecordId") REFERENCES "MachineRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRecordValue" ADD CONSTRAINT "MachineRecordValue_machineSettingValueId_fkey" FOREIGN KEY ("machineSettingValueId") REFERENCES "MachineSettingValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTool" ADD CONSTRAINT "FreeTool_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeRecord" ADD CONSTRAINT "FreeRecord_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "FreeTool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeRecord" ADD CONSTRAINT "FreeRecord_recordItemId_fkey" FOREIGN KEY ("recordItemId") REFERENCES "RecordItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingRecord" ADD CONSTRAINT "StretchingRecord_recordItemId_fkey" FOREIGN KEY ("recordItemId") REFERENCES "RecordItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingRecord" ADD CONSTRAINT "StretchingRecord_freeToolId_fkey" FOREIGN KEY ("freeToolId") REFERENCES "FreeTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRecord" ADD CONSTRAINT "MemberRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTime" ADD CONSTRAINT "WeekTime_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ChatRoomParticipant" ADD CONSTRAINT "ChatRoomParticipant_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomParticipant" ADD CONSTRAINT "ChatRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadStatus" ADD CONSTRAINT "MessageReadStatus_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadStatus" ADD CONSTRAINT "MessageReadStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PtProductToTrainer" ADD CONSTRAINT "_PtProductToTrainer_A_fkey" FOREIGN KEY ("A") REFERENCES "PtProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PtProductToTrainer" ADD CONSTRAINT "_PtProductToTrainer_B_fkey" FOREIGN KEY ("B") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToOpeningHour" ADD CONSTRAINT "_FitnessCenterToOpeningHour_B_fkey" FOREIGN KEY ("B") REFERENCES "OpeningHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
