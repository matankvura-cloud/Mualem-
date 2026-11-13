// שליחת הודעות (אימייל / SMS). בסביבת פיתוח ובדיקה ההודעות נכתבות ל-dev_outbox ומוצגות ב-/dev/outbox.
// חיבור לספק אמיתי (אימייל/SMS) יתווסף בשלב הפיילוט דרך אותו ממשק. אין שליחה אמיתית בקוד הזה.
import { asService } from "@/lib/db";

export type OutMessage = { channel: "email" | "sms"; to: string; subject?: string; body: string };

export function isProduction() {
  return process.env.APP_ENV === "production";
}

export async function sendMessage(m: OutMessage): Promise<{ delivered: boolean; via: string }> {
  if (isProduction()) {
    // אין ספק הודעות מחובר. מסרבים במפורש במקום להעמיד פנים.
    throw new Error("messaging_provider_not_configured");
  }
  await asService((tx) => tx`insert into dev_outbox (channel, recipient, subject, body) values (${m.channel}, ${m.to}, ${m.subject ?? null}, ${m.body})`);
  return { delivered: true, via: "dev_outbox" };
}
