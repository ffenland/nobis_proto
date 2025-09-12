/*
  Warnings:

  - The values [EXERCISE] on the enum `ImageType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lessonRecordId` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `lessonRecordId` on the `Video` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ImageType_new" AS ENUM ('PROFILE', 'MACHINE', 'CENTER', 'FREE_EXERCISE', 'STRETCHING', 'LESSON', 'BEFORE_AFTER', 'ACHIEVEMENT', 'CONDITION', 'EQUIPMENT');
ALTER TABLE "Image" ALTER COLUMN "type" TYPE "ImageType_new" USING ("type"::text::"ImageType_new");
ALTER TYPE "ImageType" RENAME TO "ImageType_old";
ALTER TYPE "ImageType_new" RENAME TO "ImageType";
DROP TYPE "ImageType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_lessonRecordId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_lessonRecordId_fkey";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "lessonRecordId",
ADD COLUMN     "lessonId" UUID;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "lessonRecordId",
ADD COLUMN     "lessonId" UUID;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
