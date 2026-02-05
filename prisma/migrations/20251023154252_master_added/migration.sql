/*
  Warnings:

  - A unique constraint covering the columns `[trainerId]` on the table `Manager` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trainerId` to the `Manager` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Manager" ADD COLUMN     "trainerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "Master" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,

    CONSTRAINT "Master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FitnessCenterToMaster" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToMaster_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Master_userId_key" ON "Master"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Master_trainerId_key" ON "Master"("trainerId");

-- CreateIndex
CREATE INDEX "_FitnessCenterToMaster_B_index" ON "_FitnessCenterToMaster"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_trainerId_key" ON "Manager"("trainerId");

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Master" ADD CONSTRAINT "Master_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Master" ADD CONSTRAINT "Master_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToMaster" ADD CONSTRAINT "_FitnessCenterToMaster_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToMaster" ADD CONSTRAINT "_FitnessCenterToMaster_B_fkey" FOREIGN KEY ("B") REFERENCES "Master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
