/*
  Warnings:

  - You are about to drop the column `freeExerciseRecordId` on the `FreeSetRecord` table. All the data in the column will be lost.
  - You are about to drop the column `machineExerciseRecordId` on the `MachineSetRecord` table. All the data in the column will be lost.
  - You are about to drop the column `freeExerciseRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the column `machineExerciseRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the column `stretchingExerciseRecordId` on the `PtRecordItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `StretchingExerciseRecord` table. All the data in the column will be lost.
  - You are about to drop the `FreeExerciseRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MachineExerciseRecord` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ptRecordItemId` to the `FreeSetRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ptRecordItemId` to the `MachineSetRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ptRecordItemId` to the `StretchingExerciseRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stretchingExerciseId` to the `StretchingExerciseRecord` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FreeSetRecord" DROP CONSTRAINT "FreeSetRecord_freeExerciseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "MachineSetRecord" DROP CONSTRAINT "MachineSetRecord_machineExerciseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_freeExerciseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_machineExerciseRecordId_fkey";

-- DropForeignKey
ALTER TABLE "PtRecordItem" DROP CONSTRAINT "PtRecordItem_stretchingExerciseRecordId_fkey";

-- AlterTable
ALTER TABLE "FreeSetRecord" DROP COLUMN "freeExerciseRecordId",
ADD COLUMN     "ptRecordItemId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MachineSetRecord" DROP COLUMN "machineExerciseRecordId",
ADD COLUMN     "ptRecordItemId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtRecordItem" DROP COLUMN "freeExerciseRecordId",
DROP COLUMN "machineExerciseRecordId",
DROP COLUMN "stretchingExerciseRecordId",
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "StretchingExerciseRecord" DROP COLUMN "title",
ADD COLUMN     "ptRecordItemId" UUID NOT NULL,
ADD COLUMN     "stretchingExerciseId" UUID NOT NULL;

-- DropTable
DROP TABLE "FreeExerciseRecord";

-- DropTable
DROP TABLE "MachineExerciseRecord";

-- AddForeignKey
ALTER TABLE "MachineSetRecord" ADD CONSTRAINT "MachineSetRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_stretchingExerciseId_fkey" FOREIGN KEY ("stretchingExerciseId") REFERENCES "StretchingExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StretchingExerciseRecord" ADD CONSTRAINT "StretchingExerciseRecord_ptRecordItemId_fkey" FOREIGN KEY ("ptRecordItemId") REFERENCES "PtRecordItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
