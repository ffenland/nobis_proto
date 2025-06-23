/*
  Warnings:

  - You are about to drop the column `userId` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `Trainer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MediaUsage_userId_key";

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "Trainer" DROP COLUMN "avatar";

-- CreateIndex
CREATE INDEX "MediaUsage_userId_idx" ON "MediaUsage"("userId");
