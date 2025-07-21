/*
  Warnings:

  - Added the required column `schedule` to the `PtRejectInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtRejectInfo" ADD COLUMN     "schedule" TEXT NOT NULL;
