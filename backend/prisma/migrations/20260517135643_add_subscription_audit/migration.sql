-- CreateEnum
CREATE TYPE "SubscriptionAuditReason" AS ENUM ('REPLACED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'ADMIN_REMOVED', 'OTHER');

-- CreateTable
CREATE TABLE "SubscriptionAudit" (
    "id" TEXT NOT NULL,
    "originalSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "paymentStatus" "PayStatus",
    "paymentMethod" TEXT,
    "paymentTransactionId" TEXT,
    "paymentPaidAt" TIMESTAMP(3),
    "paymentAmount" INTEGER,
    "paymentRawResponse" JSONB,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "reason" "SubscriptionAuditReason" NOT NULL,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionAudit_userId_idx" ON "SubscriptionAudit"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionAudit_originalSubscriptionId_idx" ON "SubscriptionAudit"("originalSubscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionAudit_invoiceNumber_idx" ON "SubscriptionAudit"("invoiceNumber");
