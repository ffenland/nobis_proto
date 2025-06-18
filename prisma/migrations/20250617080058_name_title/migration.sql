/*
  Warnings:

  - You are about to drop the column `name` on the `FreeExerciseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FreeSetRecord` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `StretchingExerciseRecord` table. All the data in the column will be lost.
  - Added the required column `title` to the `FreeExerciseRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `StretchingExerciseRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreeExerciseRecord" DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FreeSetRecord" DROP COLUMN "title";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "StretchingExerciseRecord" DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL;
