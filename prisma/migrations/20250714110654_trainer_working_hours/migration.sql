/*
  Warnings:

  - You are about to drop the column `weekDay` on the `TrainerOff` table. All the data in the column will be lost.
  - Made the column `date` on table `TrainerOff` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "TrainerOff" DROP COLUMN "weekDay",
ALTER COLUMN "date" SET NOT NULL;

-- CreateTable
CREATE TABLE "TrainerWorkingHour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainerId" UUID NOT NULL,
    "dayOfWeek" "WeekDay" NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,

    CONSTRAINT "TrainerWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerWorkingHour_trainerId_dayOfWeek_idx" ON "TrainerWorkingHour"("trainerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerWorkingHour_trainerId_dayOfWeek_startTime_endTime_key" ON "TrainerWorkingHour"("trainerId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "TrainerOff_trainerId_date_idx" ON "TrainerOff"("trainerId", "date");

-- AddForeignKey
ALTER TABLE "TrainerWorkingHour" ADD CONSTRAINT "TrainerWorkingHour_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
