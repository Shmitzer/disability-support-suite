// email-templates.ts — pure builders for transactional emails (Phase F). Each
// returns { subject, html, text }; the caller hands it to sendEmail(). Pure + no
// imports, so it's unit-testable and contains no provider details.

export type EmailContent = { subject: string; html: string; text: string };

// Escape interpolated values for HTML (org names come from the DB; be safe anyway).
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// A minimal, inline-styled shell (email clients don't load external CSS).
function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;">
  <div style="max-width:480px;margin:0 auto;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;line-height:1.5;">
    <h1 style="font-size:18px;margin:0 0 16px;">${heading}</h1>
    ${bodyHtml}
    <p style="color:#71717a;font-size:12px;margin-top:24px;border-top:1px solid #e4e4e7;padding-top:12px;">Disability Support Suite</p>
  </div></body></html>`;
}

export function subscriptionConfirmedEmail(opts: { orgName: string }): EmailContent {
  const org = esc(opts.orgName);
  return {
    subject: "Your Disability Support Suite subscription is active",
    html: shell(
      "Subscription confirmed",
      `<p>Thanks — the subscription for <strong>${org}</strong> is now active.</p>
       <p>You can review or change your plan anytime from the Billing page.</p>`,
    ),
    text:
      `Thanks — the subscription for ${opts.orgName} is now active. ` +
      `You can review or change your plan anytime from the Billing page.\n\n` +
      `Disability Support Suite`,
  };
}

export function subscriptionCancelledEmail(opts: { orgName: string }): EmailContent {
  const org = esc(opts.orgName);
  return {
    subject: "Your Disability Support Suite subscription was cancelled",
    html: shell(
      "Subscription cancelled",
      `<p>The subscription for <strong>${org}</strong> has been cancelled. You'll keep access until the end of the current billing period.</p>
       <p>Changed your mind? You can resubscribe anytime from the Billing page.</p>`,
    ),
    text:
      `The subscription for ${opts.orgName} has been cancelled. You'll keep access ` +
      `until the end of the current billing period. You can resubscribe anytime from ` +
      `the Billing page.\n\nDisability Support Suite`,
  };
}
