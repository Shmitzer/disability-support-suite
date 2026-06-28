#!/usr/bin/env node
// check-tenant-scope.mjs — CI guard against UNSCOPED tenant-table reads (Phase 0).
//
// Why this is load-bearing: the app connects to Postgres with the privileged Prisma
// role, which BYPASSES Row-Level Security (Option A — see src/lib/tenant.ts). RLS only
// protects the public Data API. So tenant isolation for the APP itself is enforced by
// the application code: every list/bulk read of a tenant-owned table MUST be scoped to
// the caller's tenant (organisationId / userId / a pre-authorized participant/worker id).
// A single unscoped findMany/updateMany/etc. on a tenant table is a cross-tenant
// leak (IDOR/BOLA). This script fails CI when one slips in.
//
// Heuristic, deliberately conservative to keep false positives near zero:
//   • Only flags LIST / BULK ops (findMany, updateMany, deleteMany, count, aggregate,
//     groupBy) on TENANT models — these are the shapes that can spill many tenants'
//     rows. findUnique/findFirst-by-id are single-row ownership lookups (the app pairs
//     them with tenantScope already) and are not flagged here.
//   • A call passes if its argument block contains a scoping token (tenantScope,
//     organisationId, userId, principalId, workerId, participantId, …) OR is marked
//     with an explicit `tenant-ok:` exemption comment on/just above the call.
//
// Exempting a legitimately-cross-tenant read (service/platform/global-seed work):
//   add a comment `// tenant-ok: <reason>` on the call line or the line above it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";

// Tenant-owned models (carry organisationId and/or userId). Keep in sync with the
// Prisma schema — a new tenant model without a scope token will be flagged, which is
// the point. Non-tenant tables (WaitlistSignup) are intentionally absent.
const TENANT_MODELS = new Set([
  "assistantContext", "assistantMessage", "auditLog", "billableItem", "careTask",
  "clockAmendmentRequest", "consent", "document", "incident", "learnedOption",
  "logEntry", "medication", "medicationAdministration", "membership", "message",
  "notification", "participant", "participantAccessGrant", "participantBudget",
  "participantCareProfile", "progressNote", "shift", "shiftEvent", "shiftHandover",
  "shiftReport", "shiftTaskCompletion", "visitVerification", "worker",
  "workerCredential", "workerParticipant",
]);

// Ops that can return / mutate MANY rows → must be tenant-scoped.
const RISKY_OPS = ["findMany", "updateMany", "deleteMany", "count", "aggregate", "groupBy"];

// Tokens whose presence in the argument block proves the read is tenant-scoped.
const SCOPE_TOKENS = [
  "tenantScope", "tenantOwner", "organisationId", "userId",
  "principalId", "workerId", "participantId", "senderId", "reportedById",
];

const EXEMPT = "tenant-ok";

// Directories that are not hand-written app code. The Prisma client
// (src/generated/prisma) is vendored generator output whose per-model JSDoc
// carries `findMany`/`updateMany` examples — scanning it produces hundreds of
// false positives and isn't tenant code we control. Skip it.
const IGNORE_DIRS = new Set(["generated", "node_modules", ".next"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

// Return the substring from the opening paren at `open` to its matching close.
function balanced(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return text.slice(open); // unbalanced (shouldn't happen in valid TS)
}

const opAlt = RISKY_OPS.join("|");
const callRe = new RegExp(`prisma\\.([a-zA-Z]+)\\.(${opAlt})\\s*\\(`, "g");

const violations = [];

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  // Local variables assigned from tenantScope()/tenantOwner() are themselves scope
  // tokens — the app commonly does `const scope = tenantScope(worker)` then
  // `where: scope` / `where: { ...scope }`. Collect those names per file.
  const localScopeVars = [
    ...text.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*(?:tenantScope|tenantOwner)\s*\(/g),
  ].map((mm) => mm[1]);
  const tokens = [...SCOPE_TOKENS, ...localScopeVars];

  let m;
  callRe.lastIndex = 0;
  while ((m = callRe.exec(text)) !== null) {
    const [, model, op] = m;
    if (!TENANT_MODELS.has(model)) continue;

    const openParen = m.index + m[0].length - 1;
    const args = balanced(text, openParen);

    // Scoped if the argument block references a tenant token (incl. a local
    // tenantScope-derived variable), matched on a word boundary.
    if (tokens.some((t) => new RegExp(`\\b${t}\\b`).test(args))) continue;

    const lineNo = text.slice(0, m.index).split("\n").length;
    // Exemption: `tenant-ok` within the args or on any of the few lines above the
    // call (room for a short multi-line justification comment).
    const ctx = lines.slice(Math.max(0, lineNo - 5), lineNo).join("\n") + "\n" + args;
    if (ctx.includes(EXEMPT)) continue;

    violations.push({ file, lineNo, model, op, snippet: (lines[lineNo - 1] ?? "").trim() });
  }
}

if (violations.length) {
  console.error("\n✖ Unscoped tenant-table read(s) detected (potential cross-tenant leak):\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.lineNo}  prisma.${v.model}.${v.op}`);
    console.error(`      ${v.snippet}`);
  }
  console.error(
    `\n${violations.length} violation(s). Scope the query (…tenantScope(worker) / organisationId / userId),`,
  );
  console.error(`or, if this read is intentionally cross-tenant, add a "// ${EXEMPT}: <reason>" comment.\n`);
  process.exit(1);
}

console.log("✓ tenant-scope guard: no unscoped tenant-table list/bulk reads found.");
