/*
  Warnings:

  - The values [PT_RECORD] on the enum `ImageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [PT_RECORD] on the enum `VideoType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ImageType_new" AS ENUM ('PROFILE', 'MACHINE', 'CENTER', 'EXERCISE', 'STRETCHING', 'LESSON', 'BEFORE_AFTER', 'ACHIEVEMENT', 'CONDITION');
ALTER TABLE "Image" ALTER COLUMN "type" TYPE "ImageType_new" USING ("type"::text::"ImageType_new");
ALTER TYPE "ImageType" RENAME TO "ImageType_old";
ALTER TYPE "ImageType_new" RENAME TO "ImageType";
DROP TYPE "ImageType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VideoType_new" AS ENUM ('EXERCISE_DEMO', 'LESSON', 'FORM_CHECK', 'PROGRESS', 'INSTRUCTION');
ALTER TABLE "Video" ALTER COLUMN "type" TYPE "VideoType_new" USING ("type"::text::"VideoType_new");
ALTER TYPE "VideoType" RENAME TO "VideoType_old";
ALTER TYPE "VideoType_new" RENAME TO "VideoType";
DROP TYPE "VideoType_old";
COMMIT;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
