// API route: GET /api/health — liveness/readiness probe for uptime monitoring
// (UptimeRobot, Phase F). Public (no auth) and never cached: it checks the app can
// reach the database with a trivial query and reports up/down.
//   200 {status:"ok"}     — app + DB healthy
//   503 {status:"error"}  — DB unreachable (monitor should alert)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // a cached health check is useless

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      time: new Date().toISOString(),
    });
  } catch {
    // Don't leak the DB error detail to an unauthenticated probe.
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
