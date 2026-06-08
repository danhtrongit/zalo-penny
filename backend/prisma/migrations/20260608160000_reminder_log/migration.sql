-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('MORNING', 'EVENING');

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "sentOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderLog_sentOn_idx" ON "ReminderLog"("sentOn");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_userId_kind_sentOn_key" ON "ReminderLog"("userId", "kind", "sentOn");
