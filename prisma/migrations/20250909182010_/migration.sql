/*
  Warnings:

  - You are about to drop the column `mimeType` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `originalName` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `originalName` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Image" DROP COLUMN "mimeType",
DROP COLUMN "originalName",
DROP COLUMN "size";

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "mimeType",
DROP COLUMN "originalName",
DROP COLUMN "size";
