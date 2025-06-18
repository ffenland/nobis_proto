/*
  Warnings:

  - You are about to drop the column `entry` on the `MachineExerciseRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachineExerciseRecord" DROP COLUMN "entry";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
