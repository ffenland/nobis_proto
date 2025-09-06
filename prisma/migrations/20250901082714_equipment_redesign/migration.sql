/*
  Warnings:

  - You are about to drop the column `brand` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Equipment` table. All the data in the column will be lost.
  - Added the required column `groupId` to the `Equipment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Equipment_fitnessCenterId_category_idx";

-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "location",
DROP COLUMN "quantity",
DROP COLUMN "title",
ADD COLUMN     "brandId" UUID,
ADD COLUMN     "groupId" UUID NOT NULL,
ALTER COLUMN "primaryValue" SET DATA TYPE TEXT,
ALTER COLUMN "secondaryValue" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- DropEnum
DROP TYPE "EquipmentCategory";

-- CreateTable
CREATE TABLE "EquipmentGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EquipmentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentBrand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EquipmentBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentGroup_name_key" ON "EquipmentGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentBrand_name_key" ON "EquipmentBrand"("name");

-- CreateIndex
CREATE INDEX "Equipment_fitnessCenterId_groupId_idx" ON "Equipment"("fitnessCenterId", "groupId");

-- CreateIndex
CREATE INDEX "Equipment_groupId_idx" ON "Equipment"("groupId");

-- CreateIndex
CREATE INDEX "Equipment_brandId_idx" ON "Equipment"("brandId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EquipmentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "EquipmentBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
