/*
  Warnings:

  - You are about to drop the column `price` on the `PtPayment` table. All the data in the column will be lost.
  - You are about to drop the `FreeRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FreeTool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineRecordValue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MemberRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecordItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StretchingRecord` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `PtPayment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('MACHINE', 'FREE', 'STRETCHING');

-- DropForeignKey
ALTER TABLE "FreeRecord" DROP CONSTRAINT "FreeRecord_recordItemId_fkey";

-- DropForeignKey
ALTER TABLE "FreeRecord" DROP CONSTRAINT "FreeRecord_toolId_fkey";

-- DropForeignKey
ALTER TABLE "FreeTool" DROP CONSTRAINT "FreeTool_fitnessCenterId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecord" DROP CONSTRAINT "MachineRecord_freeToolId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecord" DROP CONSTRAINT "MachineRecord_machineId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecord" DROP CONSTRAINT "MachineRecord_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecord" DROP CONSTRAINT "MachineRecord_memberRecordId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecord" DROP CONSTRAINT "MachineRecord_recordItemId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecordValue" DROP CONSTRAINT "MachineRecordValue_machineRecordId_fkey";

-- DropForeignKey
ALTER TABLE "MachineRecordValue" DROP CONSTRAINT "MachineRecordValue_machineSettingValueId_fkey";

-- DropForeignKey
ALTER TABLE "MemberRecord" DROP CONSTRAINT "MemberRecord_memberId_fkey";

-- DropForeignKey
ALTER TABLE "RecordItem" DROP CONSTRAINT "RecordItem_ptRecordId_fkey";

-- DropForeignKey
ALTER TABLE "StretchingRecord" DROP CONSTRAINT "StretchingRecord_freeToolId_fkey";

-- DropForeignKey
ALTER TABLE "StretchingRecord" DROP CONSTRAINT "StretchingRecord_recordItemId_fkey";

-- AlterTable
ALTER TABLE "PtPayment" DROP COLUMN "price",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- DropTable
DROP TABLE "FreeRecord";

-- DropTable
DROP TABLE "FreeTool";

-- DropTable
DROP TABLE "MachineRecord";

-- DropTable
DROP TABLE "MachineRecordValue";

-- DropTable
DROP TABLE "MemberRecord";

-- DropTable
DROP TABLE "RecordItem";

-- DropTable
DROP TABLE "StretchingRecord";

-- DropEnum
DROP TYPE "ToolType";

-- CreateTable
CREATE TABLE "PtRecordItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptRecordId" UUID NOT NULL,
    "entry" INTEGER NOT NULL,
    "description" TEXT,
    "type" "RecordType" NOT NULL,
    "machineSetRecordId" UUID,
    "freeSetRecordId" UUID,
    "stretchingSetRecordId" UUID,

    CONSTRAINT "PtRecordItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtMachineSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reps" INTEGER NOT NULL,

    CONSTRAINT "PtMachineSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "fitnessCenterId" UUID,

    CONSTRAINT "Weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "StretchingSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MachineSettingValueToPtMachineSetRecord" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MachineSettingValueToPtMachineSetRecord_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FreeSetRecordToWeights" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FreeSetRecordToWeights_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MachineSettingValueToPtMachineSetRecord_B_index" ON "_MachineSettingValueToPtMachineSetRecord"("B");

-- CreateIndex
CREATE INDEX "_FreeSetRecordToWeights_B_index" ON "_FreeSetRecordToWeights"("B");

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_ptRecordId_fkey" FOREIGN KEY ("ptRecordId") REFERENCES "PtRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_machineSetRecordId_fkey" FOREIGN KEY ("machineSetRecordId") REFERENCES "PtMachineSetRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_freeSetRecordId_fkey" FOREIGN KEY ("freeSetRecordId") REFERENCES "FreeSetRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_stretchingSetRecordId_fkey" FOREIGN KEY ("stretchingSetRecordId") REFERENCES "StretchingSetRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weights" ADD CONSTRAINT "Weights_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSettingValueToPtMachineSetRecord" ADD CONSTRAINT "_MachineSettingValueToPtMachineSetRecord_A_fkey" FOREIGN KEY ("A") REFERENCES "MachineSettingValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSettingValueToPtMachineSetRecord" ADD CONSTRAINT "_MachineSettingValueToPtMachineSetRecord_B_fkey" FOREIGN KEY ("B") REFERENCES "PtMachineSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FreeSetRecordToWeights" ADD CONSTRAINT "_FreeSetRecordToWeights_A_fkey" FOREIGN KEY ("A") REFERENCES "FreeSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FreeSetRecordToWeights" ADD CONSTRAINT "_FreeSetRecordToWeights_B_fkey" FOREIGN KEY ("B") REFERENCES "Weights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
