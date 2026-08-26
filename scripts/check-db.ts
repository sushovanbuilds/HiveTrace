import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const row = await prisma.config.upsert({
      where: { key: "db.connectivity_check" },
      create: { key: "db.connectivity_check", value: { ok: true } },
      update: { value: { ok: true, at: new Date().toISOString() } },
    });
    console.log("DB OK — Config upserted:", row.id);
    console.log("Config rows:", await prisma.config.count());
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("DB CHECK FAILED:", err.message);
  process.exit(1);
});
