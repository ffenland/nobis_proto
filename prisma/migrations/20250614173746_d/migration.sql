-- AlterTable
ALTER TABLE "MachineExerciseRecord" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';
