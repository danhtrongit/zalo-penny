import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.plan.upsert({
    where: { slug: "1-month" },
    update: { price: 9000, name: "1 Tháng", description: "Gói trải nghiệm 1 tháng" },
    create: {
      name: "1 Tháng",
      slug: "1-month",
      durationDays: 30,
      price: 9000,
      description: "Gói trải nghiệm 1 tháng",
    },
  });

  await prisma.plan.upsert({
    where: { slug: "6-month" },
    update: { price: 49000, name: "6 Tháng", description: "Gói tiết kiệm 6 tháng" },
    create: {
      name: "6 Tháng",
      slug: "6-month",
      durationDays: 180,
      price: 49000,
      description: "Gói tiết kiệm 6 tháng",
    },
  });

  await prisma.plan.upsert({
    where: { slug: "1-year" },
    update: { price: 89000, name: "1 Năm", description: "Gói tốt nhất - 1 năm" },
    create: {
      name: "1 Năm",
      slug: "1-year",
      durationDays: 365,
      price: 89000,
      description: "Gói tốt nhất - 1 năm",
    },
  });

  console.log("Seeded 3 plans successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
