-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "TrainerOff" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "managerId" UUID,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "TrainerOff" ADD CONSTRAINT "TrainerOff_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
