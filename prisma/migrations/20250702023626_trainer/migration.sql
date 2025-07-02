-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "working" BOOLEAN NOT NULL DEFAULT true;
