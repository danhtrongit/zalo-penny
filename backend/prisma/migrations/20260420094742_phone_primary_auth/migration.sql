-- DropIndex
DROP INDEX IF EXISTS "User_email_key";

-- AlterTable: make email optional, phone required + unique
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "phone" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Remove default after adding constraint
ALTER TABLE "User" ALTER COLUMN "phone" DROP DEFAULT;
