// Official Meta Graph API publishing. This is the ToS-compliant path:
// you are posting YOUR OWN content to YOUR OWN Page with a Page access token.
// No fake accounts, no scraping, no auto-engagement on other people's posts.
//
// Setup (one time):
//   1. Create a Facebook Page for your brand.
//   2. Create an app at developers.facebook.com, add "Facebook Login" + the
//      pages_manage_posts and pages_read_engagement permissions.
//   3. Get a long-lived Page access token. Put it in env: META_PAGE_TOKEN.
//   4. Put your Page ID in config.json (channel.pageId).
//
// Graph API supports native scheduling: pass published=false + scheduled_publish_time
// (unix seconds, 10 min - 30 days out). Meta does the scheduling for you.

const GRAPH = "https://graph.facebook.com/v21.0";

export async function publishOrSchedule({ pageId, token, message, scheduledUnix }) {
  if (!token) throw new Error("META_PAGE_TOKEN not set — cannot publish.");
  const body = new URLSearchParams({ message, access_token: token });
  if (scheduledUnix) {
    body.set("published", "false");
    body.set("scheduled_publish_time", String(scheduledUnix));
  }
  const res = await fetch(`${GRAPH}/${pageId}/feed`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta API error: ${JSON.stringify(json)}`);
  return json; // { id: "..." }
}

// Resolve "Tue 12:30" (config preferred times) against a base date, AEST(+10),
// rolling forward to the next matching slot at least 10 minutes in the future.
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function nextSlotUnix(slotLabel, fromDate = new Date()) {
  const [day, hm] = slotLabel.split(" ");
  const [h, m] = hm.split(":").map(Number);
  const target = DAYS[day];
  // Work in AEST (UTC+10). NDIS audience is AU.
  const aestNow = new Date(fromDate.getTime() + 10 * 3600 * 1000);
  let delta = (target - aestNow.getUTCDay() + 7) % 7;
  const slot = new Date(aestNow);
  slot.setUTCDate(slot.getUTCDate() + delta);
  slot.setUTCHours(h, m, 0, 0);
  let unix = Math.floor((slot.getTime() - 10 * 3600 * 1000) / 1000);
  const min = Math.floor(fromDate.getTime() / 1000) + 11 * 60;
  if (unix < min) unix += 7 * 24 * 3600; // push a week if already passed
  return unix;
}
