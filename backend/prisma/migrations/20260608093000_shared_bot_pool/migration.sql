-- CreateEnum
CREATE TYPE "BotKind" AS ENUM ('OWNED', 'POOL');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING_LINK', 'LINKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'BOT_CREATE';
ALTER TYPE "AdminAction" ADD VALUE 'BOT_UPDATE';
ALTER TYPE "AdminAction" ADD VALUE 'BOT_DELETE';

-- DropForeignKey
ALTER TABLE "BotConfig" DROP CONSTRAINT "BotConfig_userId_fkey";

-- AlterTable
ALTER TABLE "BotConfig" ADD COLUMN     "botLink" TEXT,
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "kind" "BotKind" NOT NULL DEFAULT 'OWNED',
ADD COLUMN     "label" TEXT,
ADD COLUMN     "qrImageUrl" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BotAssignment" (
    "id" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING_LINK',
    "linkCode" TEXT NOT NULL,
    "linkedZaloUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedAt" TIMESTAMP(3),

    CONSTRAINT "BotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotAssignment_userId_key" ON "BotAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BotAssignment_linkCode_key" ON "BotAssignment"("linkCode");

-- CreateIndex
CREATE INDEX "BotAssignment_botConfigId_idx" ON "BotAssignment"("botConfigId");

-- CreateIndex
CREATE INDEX "BotAssignment_status_idx" ON "BotAssignment"("status");

-- CreateIndex
CREATE INDEX "BotConfig_kind_isActive_idx" ON "BotConfig"("kind", "isActive");

-- AddForeignKey
ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotAssignment" ADD CONSTRAINT "BotAssignment_botConfigId_fkey" FOREIGN KEY ("botConfigId") REFERENCES "BotConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotAssignment" ADD CONSTRAINT "BotAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
