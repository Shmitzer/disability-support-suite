// seed-learned-options.ts — RESETS the LearnedOption table to the base sets (dev).
// Safe to re-run; wipes first so each picker matches its base list exactly. In dev
// there are no real learned options to preserve.
// Run with:  npx tsx scripts/seed-learned-options.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Curated starting lists per kind, in display order. Anything else workers type is
// learned and auto-added over time; these are just the seeds.
const SEEDS: Record<string, string[]> = {
  drink: ["Water", "Tea", "Coffee", "Juice"],
  activity: [
    "Community access",
    "In-home",
    "Exercise",
    "Social",
    "Appointment",
    "Outing",
    "Shopping",
    "Rest",
  ],
};

async function main() {
  await prisma.learnedOption.deleteMany();
  for (const [kind, names] of Object.entries(SEEDS)) {
    for (const [i, name] of names.entries()) {
      await prisma.learnedOption.create({
        data: { kind, name, status: "APPROVED", source: "seed", sortOrder: i },
      });
    }
  }
  const count = await prisma.learnedOption.count();
  console.log(`Reset learned options. LearnedOption rows: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
