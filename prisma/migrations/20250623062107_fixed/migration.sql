-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateIndex
CREATE INDEX "Media_stretchingExerciseId_idx" ON "Media"("stretchingExerciseId");
