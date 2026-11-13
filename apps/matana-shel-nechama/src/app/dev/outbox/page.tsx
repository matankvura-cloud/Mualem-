import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asService } from "@/lib/db";
import { dateHe } from "@/lib/format";

export const dynamic = "force-dynamic";

async function clearOutbox() { "use server"; await asService((tx) => tx`delete from dev_outbox`); revalidatePath("/dev/outbox"); }

export default async function OutboxPage() {
  if (process.env.APP_ENV === "production") notFound();
  const rows = await asService((tx) => tx`select id, channel, recipient, subject, body, created_at from dev_outbox order by id desc limit 50`);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl">תיבת הודעות לפיתוח</h1><p className="text-sm text-muted">כאן נוחתות הודעות האימייל וה-SMS בסביבת הבדיקה. בפיילוט יחובר ספק הודעות אמיתי.</p></div>
        <form action={clearOutbox}><button className="btn btn-outline btn-sm">ניקוי</button></form>
      </div>
      <ul className="mt-6 space-y-3">
        {rows.length === 0 && <li className="text-muted">אין הודעות עדיין.</li>}
        {rows.map((m) => (
          <li key={m.id} className="card p-4 text-sm" data-testid="outbox-message">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className={`badge ${m.channel === "sms" ? "badge-navy" : "badge-gold"}`}>{m.channel === "sms" ? "SMS" : "אימייל"}</span>
              <bdi>{m.recipient}</bdi><span>·</span><span>{dateHe(m.created_at, true)}</span>
            </div>
            {m.subject && <p className="mt-1 font-medium">{m.subject}</p>}
            <pre className="mt-1 whitespace-pre-wrap font-body" data-testid="outbox-body">{linkify(m.body)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

function linkify(body: string) {
  const parts = body.split(/(https?:\/\/\S+)/g);
  // קישור רגיל, ללא prefetch: קישור כניסה לא אמור להיצרך בלי לחיצה
  return parts.map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p.replace(/^https?:\/\/[^/]+/, "")} className="text-navy underline break-all" dir="ltr">{p}</a> : <span key={i}>{p}</span>);
}
