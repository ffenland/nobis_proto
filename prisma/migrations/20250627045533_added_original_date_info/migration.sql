/*
  Warnings:

  - Added the required column `originalDate` to the `PtScheduleChangeRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalEndTime` to the `PtScheduleChangeRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalStartTime` to the `PtScheduleChangeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtScheduleChangeRequest" ADD COLUMN     "originalDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "originalEndTime" INTEGER NOT NULL,
ADD COLUMN     "originalStartTime" INTEGER NOT NULL;
