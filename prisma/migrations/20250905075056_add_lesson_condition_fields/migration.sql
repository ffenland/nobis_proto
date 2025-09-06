-- AlterEnum
ALTER TYPE "ImageType" ADD VALUE 'CONDITION';

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "lessonConditionId" UUID;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "conditionMemo" TEXT,
ADD COLUMN     "conditionRecordedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_lessonConditionId_fkey" FOREIGN KEY ("lessonConditionId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
