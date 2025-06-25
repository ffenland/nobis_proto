/*
  Warnings:

  - A unique constraint covering the columns `[dayOfWeek,openTime,closeTime,isClosed]` on the table `OpeningHour` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OpeningHour_dayOfWeek_openTime_closeTime_key";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_dayOfWeek_openTime_closeTime_isClosed_key" ON "OpeningHour"("dayOfWeek", "openTime", "closeTime", "isClosed");
