/*
  Warnings:

  - You are about to drop the column `managerCheckedAt` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByManagerId` on the `LessonCancel` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByManagerId` on the `PtPause` table. All the data in the column will be lost.
  - You are about to drop the column `managerId` on the `TrainerOff` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_managerId_fkey";

-- DropForeignKey
ALTER TABLE "LessonCancel" DROP CONSTRAINT "LessonCancel_approvedByManagerId_fkey";

-- DropForeignKey
ALTER TABLE "PtPause" DROP CONSTRAINT "PtPause_approvedByManagerId_fkey";

-- DropForeignKey
ALTER TABLE "TrainerOff" DROP CONSTRAINT "TrainerOff_managerId_fkey";

-- DropIndex
DROP INDEX "LessonCancel_approvedByManagerId_idx";

-- DropIndex
DROP INDEX "PtPause_approvedByManagerId_idx";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "managerCheckedAt",
DROP COLUMN "managerId";

-- AlterTable
ALTER TABLE "LessonCancel" DROP COLUMN "approvedByManagerId",
ADD COLUMN     "approvedById" UUID;

-- AlterTable
ALTER TABLE "PtPause" DROP COLUMN "approvedByManagerId",
ADD COLUMN     "approvedByMasterId" UUID;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "TrainerOff" DROP COLUMN "managerId",
ADD COLUMN     "masterId" UUID;

-- CreateIndex
CREATE INDEX "LessonCancel_approvedById_idx" ON "LessonCancel"("approvedById");

-- CreateIndex
CREATE INDEX "PtPause_approvedByMasterId_idx" ON "PtPause"("approvedByMasterId");

-- AddForeignKey
ALTER TABLE "PtPause" ADD CONSTRAINT "PtPause_approvedByMasterId_fkey" FOREIGN KEY ("approvedByMasterId") REFERENCES "Master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCancel" ADD CONSTRAINT "LessonCancel_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerOff" ADD CONSTRAINT "TrainerOff_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
