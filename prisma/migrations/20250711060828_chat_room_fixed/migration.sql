/*
  Warnings:

  - You are about to drop the `ChatRoomParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeekTime` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userOneId,userTwoId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userOneId` to the `ChatRoom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userTwoId` to the `ChatRoom` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChatRoomParticipant" DROP CONSTRAINT "ChatRoomParticipant_chatRoomId_fkey";

-- DropForeignKey
ALTER TABLE "ChatRoomParticipant" DROP CONSTRAINT "ChatRoomParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "WeekTime" DROP CONSTRAINT "WeekTime_ptId_fkey";

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "userOneId" UUID NOT NULL,
ADD COLUMN     "userTwoId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- DropTable
DROP TABLE "ChatRoomParticipant";

-- DropTable
DROP TABLE "WeekTime";

-- CreateIndex
CREATE INDEX "ChatRoom_userOneId_idx" ON "ChatRoom"("userOneId");

-- CreateIndex
CREATE INDEX "ChatRoom_userTwoId_idx" ON "ChatRoom"("userTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_userOneId_userTwoId_key" ON "ChatRoom"("userOneId", "userTwoId");

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
