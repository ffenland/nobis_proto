/*
  Warnings:

  - You are about to drop the column `isActive` on the `Pt` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PtState" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "Pt" DROP COLUMN "isActive",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "state" "PtState" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
