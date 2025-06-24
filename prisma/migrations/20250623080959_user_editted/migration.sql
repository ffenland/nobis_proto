-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastUsernameChangeAt" TIMESTAMP(3),
ADD COLUMN     "usernameChangeCount" INTEGER NOT NULL DEFAULT 0;
