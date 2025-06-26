-- CreateEnum
CREATE TYPE "ScheduleChangeState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

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
    "state" "ScheduleChangeState" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "responderId" UUID,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_ptRecordId_idx" ON "PtScheduleChangeRequest"("ptRecordId");

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_state_idx" ON "PtScheduleChangeRequest"("state");

-- CreateIndex
CREATE INDEX "PtScheduleChangeRequest_expiresAt_idx" ON "PtScheduleChangeRequest"("expiresAt");

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtScheduleChangeRequest" ADD CONSTRAINT "PtScheduleChangeRequest_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
