/*
  Warnings:

  - You are about to drop the column `nictTid` on the `PtPayment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CARD', 'CASH', 'POINT');

-- AlterTable
ALTER TABLE "PtPayment" DROP COLUMN "nictTid",
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
