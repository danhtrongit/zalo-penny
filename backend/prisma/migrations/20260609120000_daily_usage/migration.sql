-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "limitNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUsage_date_idx" ON "DailyUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_date_key" ON "DailyUsage"("userId", "date");
