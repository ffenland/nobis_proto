-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "LessonCancel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lessonId" UUID NOT NULL,
    "canceledBy" TEXT NOT NULL,
    "canceledById" UUID NOT NULL,
    "canceledByName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "canceledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedByManagerId" UUID,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "LessonCancel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonCancel_lessonId_key" ON "LessonCancel"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCancel_lessonId_idx" ON "LessonCancel"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCancel_canceledAt_idx" ON "LessonCancel"("canceledAt");

-- CreateIndex
CREATE INDEX "LessonCancel_isApproved_idx" ON "LessonCancel"("isApproved");

-- CreateIndex
CREATE INDEX "LessonCancel_approvedByManagerId_idx" ON "LessonCancel"("approvedByManagerId");

-- AddForeignKey
ALTER TABLE "LessonCancel" ADD CONSTRAINT "LessonCancel_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCancel" ADD CONSTRAINT "LessonCancel_approvedByManagerId_fkey" FOREIGN KEY ("approvedByManagerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
