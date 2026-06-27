// prisma.ts — sets up ONE shared connection to the Supabase PostgreSQL database
// that the whole app reuses. In Prisma 7 the app connects via a "driver adapter".

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse one client across hot-reloads in development (avoids opening many connections).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
