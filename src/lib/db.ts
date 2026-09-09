import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type DbClient = PrismaClient;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: DbClient;
};

/**
 * Resolve Prisma only when data is actually requested.
 *
 * Next.js evaluates route modules while collecting build configuration. A
 * database is intentionally not required in that phase, particularly for the
 * self-contained demo experience. Keeping this boundary lazy lets the build
 * complete without a DATABASE_URL while retaining a clear error for any live
 * database operation at runtime.
 */
export function getDb(): DbClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Compatibility facade for the existing data-access layer. Delegates are
 * resolved lazily, so importing a route never opens or configures a client.
 */
export const db = new Proxy({} as DbClient, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
