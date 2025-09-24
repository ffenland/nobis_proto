/*
  Warnings:

  - You are about to drop the column `originalDate` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `originalEndTime` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `originalStartTime` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedDate` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedEndTime` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedStartTime` on the `ScheduleChangeRequest` table. All the data in the column will be lost.
  - Added the required column `originalStratAt` to the `ScheduleChangeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "managerCheckedAt" TIMESTAMP(3),
ADD COLUMN     "managerId" UUID;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "ScheduleChangeRequest" DROP COLUMN "originalDate",
DROP COLUMN "originalEndTime",
DROP COLUMN "originalStartTime",
DROP COLUMN "requestedDate",
DROP COLUMN "requestedEndTime",
DROP COLUMN "requestedStartTime",
ADD COLUMN     "originalStratAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "requestedStartAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
