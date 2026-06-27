// email.ts — the ONE place the app sends transactional email (Phase F), via Resend.
// Env-gated: without RESEND_API_KEY, sendEmail() no-ops (returns {skipped:true}) so
// dev/sandbox never tries to send. Supabase already sends the auth magic-link; this
// is for app email (receipts, invites, notifications).

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Disability Support Suite <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(apiKey);
}

let client: Resend | null = null;
function getResend(): Resend {
  if (!apiKey) throw new Error("Resend is not configured (RESEND_API_KEY missing).");
  client ??= new Resend(apiKey);
  return client;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ id?: string; skipped?: boolean }> {
  if (!emailConfigured()) {
    console.warn(`email not configured — skipping send: "${opts.subject}"`);
    return { skipped: true };
  }
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return { id: data?.id };
}
