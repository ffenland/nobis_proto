/*
  Warnings:

  - You are about to drop the column `extraDays` on the `Pt` table. All the data in the column will be lost.
  - You are about to drop the column `canceledAt` on the `PtPause` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `PtPause` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PtPause" DROP CONSTRAINT "PtPause_ptId_fkey";

-- DropIndex
DROP INDEX "PtPause_ptId_isActive_idx";

-- AlterTable
ALTER TABLE "Pt" DROP COLUMN "extraDays";

-- AlterTable
ALTER TABLE "PtPause" DROP COLUMN "canceledAt",
DROP COLUMN "isActive",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByManagerId" UUID,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateIndex
CREATE INDEX "PtPause_ptId_idx" ON "PtPause"("ptId");

-- CreateIndex
CREATE INDEX "PtPause_isApproved_idx" ON "PtPause"("isApproved");

-- CreateIndex
CREATE INDEX "PtPause_approvedByManagerId_idx" ON "PtPause"("approvedByManagerId");

-- AddForeignKey
ALTER TABLE "PtPause" ADD CONSTRAINT "PtPause_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtPause" ADD CONSTRAINT "PtPause_approvedByManagerId_fkey" FOREIGN KEY ("approvedByManagerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
