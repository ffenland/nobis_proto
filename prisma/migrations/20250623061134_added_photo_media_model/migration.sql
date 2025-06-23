/*
  Warnings:

  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `MachinePhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StretchingPhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPhoto` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[avatarMediaId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('PROFILE', 'MACHINE', 'CENTER', 'EXERCISE', 'STRETCHING', 'PT_RECORD', 'BEFORE_AFTER', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('EXERCISE_DEMO', 'PT_RECORD', 'FORM_CHECK', 'PROGRESS', 'INSTRUCTION');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'ACTIVE', 'SCHEDULED_DELETE', 'DELETED');

-- DropForeignKey
ALTER TABLE "MachinePhoto" DROP CONSTRAINT "MachinePhoto_machineId_fkey";

-- DropForeignKey
ALTER TABLE "StretchingPhoto" DROP CONSTRAINT "StretchingPhoto_stretchingExerciseId_fkey";

-- DropForeignKey
ALTER TABLE "UserPhoto" DROP CONSTRAINT "UserPhoto_userId_fkey";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar",
ADD COLUMN     "avatarMediaId" UUID,
ADD COLUMN     "isPremiumUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionExpiry" TIMESTAMP(3);

-- DropTable
DROP TABLE "MachinePhoto";

-- DropTable
DROP TABLE "StretchingPhoto";

-- DropTable
DROP TABLE "UserPhoto";

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" "PhotoType",
    "videoType" "VideoType",
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "r2Key" TEXT,
    "streamId" TEXT,
    "publicUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "resolution" TEXT,
    "embedUrl" TEXT,
    "scheduledDeleteAt" TIMESTAMP(3),
    "autoDeleteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" UUID NOT NULL,
    "machineId" UUID,
    "fitnessCenterId" UUID,
    "ptRecordItemId" UUID,
    "stretchingExerciseId" UUID,
    "metadata" JSONB,
    "userId" UUID NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Media_uploadedById_idx" ON "Media"("uploadedById");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_videoType_idx" ON "Media"("videoType");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE INDEX "Media_scheduledDeleteAt_idx" ON "Media"("scheduledDeleteAt");

-- CreateIndex
CREATE INDEX "Media_machineId_idx" ON "Media"("machineId");

-- CreateIndex
CREATE INDEX "Media_fitnessCenterId_idx" ON "Media"("fitnessCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_userId_key" ON "MediaUsage"("userId");

-- CreateIndex
CREATE INDEX "MediaUsage_month_idx" ON "MediaUsage"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_userId_month_key" ON "MediaUsage"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarMediaId_key" ON "User"("avatarMediaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
