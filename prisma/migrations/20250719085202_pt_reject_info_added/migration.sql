-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "PtRejectInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ptId" UUID NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "PtRejectInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PtRejectInfo_ptId_key" ON "PtRejectInfo"("ptId");

-- AddForeignKey
ALTER TABLE "PtRejectInfo" ADD CONSTRAINT "PtRejectInfo_ptId_fkey" FOREIGN KEY ("ptId") REFERENCES "Pt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
