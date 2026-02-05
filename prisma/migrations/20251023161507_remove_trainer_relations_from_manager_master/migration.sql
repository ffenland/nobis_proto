/*
  Warnings:

  - You are about to drop the column `trainerId` on the `Manager` table. All the data in the column will be lost.
  - You are about to drop the column `trainerId` on the `Master` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Manager" DROP CONSTRAINT "Manager_trainerId_fkey";

-- DropForeignKey
ALTER TABLE "Master" DROP CONSTRAINT "Master_trainerId_fkey";

-- DropIndex
DROP INDEX "Manager_trainerId_key";

-- DropIndex
DROP INDEX "Master_trainerId_key";

-- AlterTable
ALTER TABLE "Manager" DROP COLUMN "trainerId";

-- AlterTable
ALTER TABLE "Master" DROP COLUMN "trainerId";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
