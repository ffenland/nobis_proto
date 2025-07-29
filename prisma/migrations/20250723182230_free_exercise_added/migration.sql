/*
  Warnings:

  - Added the required column `freeExerciseId` to the `FreeSetRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FreeSetRecord" ADD COLUMN     "freeExerciseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "freeExerciseId" UUID;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "FreeExercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FreeExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_freeExerciseId_idx" ON "Media"("freeExerciseId");

-- AddForeignKey
ALTER TABLE "FreeSetRecord" ADD CONSTRAINT "FreeSetRecord_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_freeExerciseId_fkey" FOREIGN KEY ("freeExerciseId") REFERENCES "FreeExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
