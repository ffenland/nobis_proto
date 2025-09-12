/*
  Warnings:

  - You are about to drop the column `confirmedAt` on the `Pt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pt" DROP COLUMN "confirmedAt",
ADD COLUMN     "stateUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
