/**
 * Mock mail transport. No email provider is configured for this build (§12/PRD
 * scope note), so outbound mail is logged and kept in an in-memory outbox that
 * the /dev/inbox page renders — this lets the OTP/invitation flows be exercised
 * end-to-end without wiring a real provider. Swap the body of `sendMail` for a
 * real provider (Resend/SES/SendGrid) call when one is available; every caller
 * already awaits it.
 */

export type OutboxMail = {
  id: string;
  to: string;
  subject: string;
  text: string;
  sentAt: string;
};

const globalForMailer = globalThis as unknown as { __outbox?: OutboxMail[] };
const outbox = (globalForMailer.__outbox ??= []);

export async function sendMail(mail: { to: string; subject: string; text: string }) {
  const entry: OutboxMail = {
    id: Math.random().toString(36).slice(2),
    ...mail,
    sentAt: new Date().toISOString(),
  };
  outbox.unshift(entry);
  if (outbox.length > 100) outbox.length = 100;

  console.log(`[mail] to=${mail.to} subject="${mail.subject}" :: ${mail.text}`);

  return entry;
}

export function getOutbox() {
  return outbox;
}
