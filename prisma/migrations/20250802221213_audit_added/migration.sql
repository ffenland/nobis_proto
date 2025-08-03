-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_ITEM', 'UPDATE_ITEM', 'DELETE_ITEM', 'CREATE_RECORD', 'UPDATE_RECORD');

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtRecordItem" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID;

-- CreateTable
CREATE TABLE "PtRecordAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainerId" UUID NOT NULL,
    "ptRecordId" UUID NOT NULL,
    "ptRecordItemId" UUID,
    "action" "AuditAction" NOT NULL,
    "actionDetails" JSONB,
    "scheduledTime" TIMESTAMP(3),
    "isOutOfTime" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,

    CONSTRAINT "PtRecordAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PtRecordAuditLog_trainerId_idx" ON "PtRecordAuditLog"("trainerId");

-- CreateIndex
CREATE INDEX "PtRecordAuditLog_ptRecordId_idx" ON "PtRecordAuditLog"("ptRecordId");

-- CreateIndex
CREATE INDEX "PtRecordAuditLog_action_idx" ON "PtRecordAuditLog"("action");

-- CreateIndex
CREATE INDEX "PtRecordAuditLog_isOutOfTime_idx" ON "PtRecordAuditLog"("isOutOfTime");

-- CreateIndex
CREATE INDEX "PtRecordAuditLog_createdAt_idx" ON "PtRecordAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PtRecordAuditLog" ADD CONSTRAINT "PtRecordAuditLog_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordAuditLog" ADD CONSTRAINT "PtRecordAuditLog_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
