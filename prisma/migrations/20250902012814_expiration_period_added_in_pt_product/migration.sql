/*
  Warnings:

  - Added the required column `expiration_period` to the `PtProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PtProduct" ADD COLUMN     "expiration_period" INTEGER NOT NULL,
ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
