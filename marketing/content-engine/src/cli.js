#!/usr/bin/env node
// NDIS Content Engine — transparent, ToS-compliant marketing funnel.
//
//   plan      Show the 2-week founder-story content calendar.
//   draft     Generate post drafts into ./drafts/queue.json (status: needs_review).
//   review    List drafts and their status. Approve by editing queue.json
//             (set "status": "approved"). Nothing posts without approval.
//   schedule  Push every APPROVED draft to Meta as a natively-scheduled post.
//
// Guardrails baked in: only your own Page, only approved drafts, only the
// official Graph API. No fake personas, no auto-engagement, no scraping.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJSON, generatePost } from "./generate.js";
import { publishOrSchedule, nextSlotUnix } from "./meta.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = path.join(root, "drafts", "queue.json");

const readQueue = () => (fs.existsSync(QUEUE) ? JSON.parse(fs.readFileSync(QUEUE, "utf8")) : []);
const writeQueue = (q) => fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2));

function flatArc() {
  const arc = loadJSON("content/arc.json");
  return [
    ...arc.week1.map((i) => ({ ...i, week: 1 })),
    ...arc.week2.map((i) => ({ ...i, week: 2 }))
  ];
}

async function cmdPlan() {
  const cfg = loadJSON("config.json");
  console.log(`\n  2-WEEK FOUNDER-STORY FUNNEL — ${cfg.brand.displayName}\n`);
  console.log(`  Week 1: ${cfg.arc.week1}`);
  console.log(`  Week 2: ${cfg.arc.week2}\n`);
  for (const i of flatArc()) {
    const slot = cfg.channel.preferredTimesAEST[(i.weekIdx ?? 0)] || "";
    console.log(`  W${i.week} ${i.day.padEnd(3)} [${i.type.padEnd(9)}] ${i.topic}`);
  }
  console.log(`\n  App-mention policy: ${cfg.app.mentionPolicy}\n`);
}

async function cmdDraft() {
  const cfg = loadJSON("config.json");
  const items = flatArc();
  const times = cfg.channel.preferredTimesAEST;
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

function cmdReview() {
  const q = readQueue();
  if (!q.length) return console.log("  No drafts yet. Run: node src/cli.js draft");
  console.log("");
  for (const d of q) {
    console.log(`  [${d.status.toUpperCase()}] ${d.id}  (${d.slot})`);
    console.log(`  ${d.topic}`);
    console.log("  " + d.text.replace(/\n/g, "\n  "));
    console.log("  " + "-".repeat(56));
  }
  const n = q.filter((d) => d.status === "approved").length;
  console.log(`\n  ${n}/${q.length} approved and ready to schedule.\n`);
}

async function cmdSchedule() {
  const cfg = loadJSON("config.json");
  const token = process.env.META_PAGE_TOKEN;
  const pageId = cfg.channel.pageId;
  const q = readQueue();
  const approved = q.filter((d) => d.status === "approved");
  if (!approved.length) return console.log("  Nothing approved. Edit drafts/queue.json first.");
  if (pageId.startsWith("<")) return console.log("  Set channel.pageId in config.json first.");
  for (const d of approved) {
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
const map = { plan: cmdPlan, draft: cmdDraft, review: cmdReview, schedule: cmdSchedule };
(map[cmd] || (() => console.log("Usage: ndis-content <plan|draft|review|schedule>")))();
