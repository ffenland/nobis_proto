/*
  Warnings:

  - You are about to drop the column `freeSetRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the column `machineSetRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the column `stretchingSetRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the `PtMachineSetRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StretchingSetRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MachineSettingValueToPtMachineSetRecord` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `freeExerciseRecordId` to the `FreeSetRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `set` to the `FreeSetRecord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_freeSetRecordId_fkey";

-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_machineSetRecordId_fkey";

-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_stretchingSetRecordId_fkey";

-- DropForeignKey
ALTER TABLE "_MachineSettingValueToPtMachineSetRecord" DROP CONSTRAINT "_MachineSettingValueToPtMachineSetRecord_A_fkey";

-- DropForeignKey
ALTER TABLE "_MachineSettingValueToPtMachineSetRecord" DROP CONSTRAINT "_MachineSettingValueToPtMachineSetRecord_B_fkey";

-- AlterTable
ALTER TABLE "FreeSetRecord" ADD COLUMN     "freeExerciseRecordId" UUID NOT NULL,
ADD COLUMN     "set" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtRecordItem" DROP COLUMN "freeSetRecordId",
DROP COLUMN "machineSetRecordId",
DROP COLUMN "stretchingSetRecordId",
ADD COLUMN     "freeExerciseRecordId" UUID,
ADD COLUMN     "machineExerciseRecordId" UUID,
ADD COLUMN     "stretchingExerciseRecordId" UUID;

-- DropTable
DROP TABLE "PtMachineSetRecord";

-- DropTable
DROP TABLE "StretchingSetRecord";

-- DropTable
DROP TABLE "_MachineSettingValueToPtMachineSetRecord";

-- CreateTable
CREATE TABLE "MachineSetRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reps" INTEGER NOT NULL,
    "set" INTEGER NOT NULL,
    "machineExerciseRecordId" UUID NOT NULL,

    CONSTRAINT "MachineSetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineExerciseRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MachineExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeExerciseRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FreeExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "stretchingExerciseId" UUID NOT NULL,

    CONSTRAINT "StretchingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingExercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "StretchingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StretchingExerciseRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "StretchingExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MachineSetRecordToMachineSettingValue" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MachineSetRecordToMachineSettingValue_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MachineSetRecordToMachineSettingValue_B_index" ON "_MachineSetRecordToMachineSettingValue"("B");

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_machineExerciseRecordId_fkey" FOREIGN KEY ("machineExerciseRecordId") REFERENCES "MachineExerciseRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_freeExerciseRecordId_fkey" FOREIGN KEY ("freeExerciseRecordId") REFERENCES "FreeExerciseRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtRecordItem" ADD CONSTRAINT "PtRecordItem_stretchingExerciseRecordId_fkey" FOREIGN KEY ("stretchingExerciseRecordId") REFERENCES "StretchingExerciseRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSetRecord" ADD CONSTRAINT "MachineSetRecord_machineExerciseRecordId_fkey" FOREIGN KEY ("machineExerciseRecordId") REFERENCES "MachineExerciseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_freeExerciseRecordId_fkey" FOREIGN KEY ("freeExerciseRecordId") REFERENCES "FreeExerciseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingPhoto" ADD CONSTRAINT "StretchingPhoto_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_A_fkey" FOREIGN KEY ("A") REFERENCES "MachineSetRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MachineSetRecordToMachineSettingValue" ADD CONSTRAINT "_MachineSetRecordToMachineSettingValue_B_fkey" FOREIGN KEY ("B") REFERENCES "MachineSettingValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
