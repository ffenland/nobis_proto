/*
  Warnings:

  - You are about to drop the column `fitnessCenterId` on the `Manager` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Manager" DROP CONSTRAINT "Manager_fitnessCenterId_fkey";

-- AlterTable
ALTER TABLE "Manager" DROP COLUMN "fitnessCenterId";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "_FitnessCenterToManager" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToManager_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FitnessCenterToManager_B_index" ON "_FitnessCenterToManager"("B");

-- AddForeignKey
ALTER TABLE "_FitnessCenterToManager" ADD CONSTRAINT "_FitnessCenterToManager_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToManager" ADD CONSTRAINT "_FitnessCenterToManager_B_fkey" FOREIGN KEY ("B") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
