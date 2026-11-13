"use client";
import { CopyButton } from "@/components/ui/CopyButton";

export function ShareClaim({ url, recipientName, buyerName }: { url: string; recipientName: string; buyerName: string }) {
  const text = `שלום ${recipientName},\n${buyerName} שלח/ה לכם מתנה של נחמה: שובר דיגיטלי לשירותים שיעזרו בימים האלה.\nלשמירת השובר בארנק המשפחתי:\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-cream-2 p-3 text-sm" dir="ltr"><span className="break-all font-mono text-[13px]" data-testid="claim-url">{url}</span></div>
      <div className="flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noopener" className="btn btn-primary">שליחה בוואטסאפ</a>
        <CopyButton text={url} label="העתקת הקישור" />
        <CopyButton text={text} label="העתקת ההודעה המלאה" className="btn btn-quiet text-sm" />
      </div>
    </div>
  );
}
