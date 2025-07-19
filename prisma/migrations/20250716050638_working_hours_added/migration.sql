-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "WorkingHour" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_FitnessCenterToWorkingHour" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FitnessCenterToWorkingHour_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FitnessCenterToWorkingHour_B_index" ON "_FitnessCenterToWorkingHour"("B");

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_A_fkey" FOREIGN KEY ("A") REFERENCES "FitnessCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FitnessCenterToWorkingHour" ADD CONSTRAINT "_FitnessCenterToWorkingHour_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkingHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
