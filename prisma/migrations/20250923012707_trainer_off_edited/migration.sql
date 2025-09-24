/*
  Warnings:

  - You are about to drop the column `date` on the `TrainerOff` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `TrainerOff` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `TrainerOff` table. All the data in the column will be lost.
  - Added the required column `endAt` to the `TrainerOff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `TrainerOff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "TrainerOff" DROP COLUMN "date",
DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL;
