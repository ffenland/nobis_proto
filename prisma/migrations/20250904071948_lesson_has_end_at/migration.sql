/*
  Warnings:

  - You are about to drop the column `duration` on the `Lesson` table. All the data in the column will be lost.
  - Added the required column `endAt` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "duration",
ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
