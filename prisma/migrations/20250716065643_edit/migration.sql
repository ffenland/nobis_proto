/*
  Warnings:

  - You are about to drop the column `isDefault` on the `WorkingHour` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "WorkingHour" DROP COLUMN "isDefault";
