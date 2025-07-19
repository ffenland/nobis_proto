/*
  Warnings:

  - You are about to drop the `TrainerWorkingHour` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TrainerWorkingHour" DROP CONSTRAINT "TrainerWorkingHour_trainerId_fkey";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- DropTable
DROP TABLE "TrainerWorkingHour";

-- CreateTable
CREATE TABLE "WorkingHour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dayOfWeek" "WeekDay" NOT NULL,
    "openTime" INTEGER NOT NULL,
    "closeTime" INTEGER NOT NULL,

    CONSTRAINT "WorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrainerToWorkingHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TrainerToWorkingHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHour_dayOfWeek_openTime_closeTime_key" ON "WorkingHour"("dayOfWeek", "openTime", "closeTime");

-- CreateIndex
CREATE INDEX "_TrainerToWorkingHour_B_index" ON "_TrainerToWorkingHour"("B");

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainerToWorkingHour" ADD CONSTRAINT "_TrainerToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
