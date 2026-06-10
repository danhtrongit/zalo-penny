import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Active paid plan: only the 6-month tier (99,000đ). The free tier is not a
  // DB plan — it's handled by POST /api/bot/free (no Subscription record).
  await prisma.plan.upsert({
    where: { slug: "6-month" },
    update: {
      price: 99000,
      name: "6 Tháng",
      description: "Gói 6 tháng",
      durationDays: 180,
      isActive: true,
    },
    create: {
      name: "6 Tháng",
      slug: "6-month",
      durationDays: 180,
      price: 99000,
      description: "Gói 6 tháng",
    },
  });

  // Retired plans: keep the rows (existing subscriptions/payments reference
  // them) but deactivate so they can no longer be purchased.
  await prisma.plan.updateMany({
    where: { slug: { in: ["1-month", "1-year"] } },
    data: { isActive: false },
  });

  console.log("Seeded plans successfully (6-month active @ 99,000đ; 1-month/1-year retired)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
