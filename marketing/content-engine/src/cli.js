#!/usr/bin/env node
// Caira Content Engine — transparent, ToS-compliant marketing funnel.
// Built to serve docs/PLAYBOOK.md (founder-led, organic-first, warm-network).
//
//   plan      Show the 2-week founder-story content calendar.
//   draft     Generate post drafts into ./drafts/queue.json (status: needs_review).
//   review    List drafts, status, and any NDIS-compliance flags.
//   check     Run only the NDIS-advertising compliance check over the queue.
//   schedule  Push every APPROVED draft to Meta as a natively-scheduled post.
//             Posts that HARD-FAIL the compliance check are blocked.
//
// Guardrails: only your own Page, only approved drafts, only the official Graph
// API, compliance-gated. No fake personas, no auto-engagement, no scraping.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJSON, generatePost } from "./generate.js";
import { publishOrSchedule, nextSlotUnix } from "./meta.js";
import { checkText } from "./compliance.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = path.join(root, "drafts", "queue.json");

const readQueue = () => (fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE, "utf8")) : []);
const writeQueue = (q) => fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2));
const fbChannel = (cfg) => cfg.channels?.facebook_page || cfg.channel || {};

function flatArc() {
  const arc = loadJSON("content/arc.json");
  return [
    ...arc.week1.map((i) => ({ ...i, week: 1 })),
    ...arc.week2.map((i) => ({ ...i, week: 2 }))
  ];
}

async function cmdPlan() {
  const cfg = loadJSON("config.json");
  console.log(`\n  2-WEEK FOUNDER-STORY FUNNEL — ${cfg.brand.displayName}`);
  console.log(`  Positioning: ${cfg.positioning || ""}\n`);
  console.log(`  Week 1: ${cfg.arc.week1}`);
  console.log(`  Week 2: ${cfg.arc.week2}\n`);
  for (const i of flatArc()) {
    console.log(`  W${i.week} ${i.day.padEnd(3)} [${i.type.padEnd(9)}] ${i.topic}`);
  }
  console.log(`\n  App-mention policy: ${cfg.app.mentionPolicy}\n`);
}

async function cmdDraft() {
  const cfg = loadJSON("config.json");
  const items = flatArc();
  const times = fbChannel(cfg).preferredTimesAEST || ["Tue 12:30"];
  const queue = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    process.stdout.write(`  drafting W${item.week} ${item.day} [${item.type}]... `);
    const text = await generatePost(cfg, item);
    queue.push({
      id: `w${item.week}-${item.day.toLowerCase()}-${item.type.toLowerCase()}`,
      week: item.week,
      type: item.type,
      topic: item.topic,
      slot: times[idx % times.length],
      text,
      status: "needs_review"
    });
    console.log("done");
  }
  writeQueue(queue);
  console.log(`\n  ${queue.length} drafts written to drafts/queue.json`);
  console.log(`  Review them, then set "status":"approved" on the ones you want live.\n`);
}

function flagLine(c) {
  if (c.banned.length) return `  ⛔ BLOCKED — banned phrase(s): ${c.banned.join(", ")}`;
  if (c.caution.length) return `  ⚠️  review wording: ${c.caution.join(", ")}`;
  return `  ✅ compliance ok`;
}

function cmdReview() {
  const cfg = loadJSON("config.json");
  const q = readQueue();
  if (!q.length) return console.log("  No drafts yet. Run: node src/cli.js draft");
  console.log("");
  for (const d of q) {
    const c = checkText(d.text || "", cfg.compliance);
    console.log(`  [${d.status.toUpperCase()}] ${d.id}  (${d.slot})`);
    console.log(`  ${d.topic}`);
    console.log("  " + (d.text || "").replace(/\n/g, "\n  "));
    console.log(flagLine(c));
    console.log("  " + "-".repeat(56));
  }
  const n = q.filter((d) => d.status === "approved").length;
  console.log(`\n  ${n}/${q.length} approved and ready to schedule.\n`);
}

function cmdCheck() {
  const cfg = loadJSON("config.json");
  const q = readQueue();
  let blocked = 0;
  for (const d of q) {
    const c = checkText(d.text || "", cfg.compliance);
    if (c.banned.length || c.caution.length) {
      console.log(`  ${d.id}:`);
      console.log(flagLine(c));
    }
    if (c.hardFail) blocked++;
  }
  console.log(`\n  ${blocked} post(s) BLOCKED on banned phrases; ${q.length - blocked} clear of hard fails.`);
  if (!blocked) console.log("  (Caution flags still need a human eye — see PLAYBOOK.md §compliance.)\n");
}

async function cmdSchedule() {
  const cfg = loadJSON("config.json");
  const token = process.env.META_PAGE_TOKEN;
  const ch = fbChannel(cfg);
  const pageId = ch.pageId;
  const q = readQueue();
  const approved = q.filter((d) => d.status === "approved");
  if (!approved.length) return console.log("  Nothing approved. Edit drafts/queue.json first.");
  if (!pageId || pageId.startsWith("<")) return console.log("  Set channels.facebook_page.pageId in config.json first.");
  for (const d of approved) {
    const c = checkText(d.text || "", cfg.compliance);
    if (c.hardFail) {
      console.log(`  ⛔ SKIPPED ${d.id} — banned phrase(s): ${c.banned.join(", ")}. Fix and re-approve.`);
      continue;
    }
    const when = nextSlotUnix(d.slot);
    try {
      const r = await publishOrSchedule({ pageId, token, message: d.text, scheduledUnix: when });
      d.status = "scheduled";
      d.postId = r.id;
      d.scheduledFor = new Date(when * 1000).toISOString();
      console.log(`  scheduled ${d.id} -> ${d.scheduledFor} (post ${r.id})`);
    } catch (e) {
      console.log(`  FAILED ${d.id}: ${e.message}`);
    }
  }
  writeQueue(q);
}

const cmd = process.argv[2];
const map = { plan: cmdPlan, draft: cmdDraft, review: cmdReview, check: cmdCheck, schedule: cmdSchedule };
(map[cmd] || (() => console.log("Usage: ndis-content <plan|draft|review|check|schedule>")))();
