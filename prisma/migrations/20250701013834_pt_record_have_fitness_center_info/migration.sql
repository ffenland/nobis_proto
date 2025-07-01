/*
  Warnings:

  - Added the required column `fitnessCenterId` to the `PtRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FitnessCenter" ADD COLUMN     "inOperation" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "PtRecord" ADD COLUMN     "fitnessCenterId" UUID;

-- 모든 PtRecord에 첫 번째 FitnessCenter ID를 설정
UPDATE "PtRecord" 
SET "fitnessCenterId" = (
  SELECT "id" FROM "FitnessCenter" LIMIT 1
);

-- NOT NULL 제약조건 추가
ALTER TABLE "PtRecord" ALTER COLUMN "fitnessCenterId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "PtRecord" ADD CONSTRAINT "PtRecord_fitnessCenterId_fkey" FOREIGN KEY ("fitnessCenterId") REFERENCES "FitnessCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;