import Link from "next/link";
import { LogoMark } from "./Logo";
import { he } from "../../../messages/he";

export function Footer() {
  return (
    <footer className="mt-16 bg-navy-deep text-cream/80">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-cream"><LogoMark className="h-7 w-7 text-gold" /><span className="font-display text-lg">{he.brand}</span></div>
            <p className="mt-2 max-w-xs text-sm">{he.tagline} שוברים דיגיטליים והטבות שמסייעים למשפחה בתקופת האבל.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm" aria-label="פוטר">
            <Link href="/gift" className="hover:text-cream">שליחת מתנה</Link>
            <Link href="/catalog" className="hover:text-cream">הטבות ושירותים</Link>
            <Link href="/about" className="hover:text-cream">אודות ושאלות נפוצות</Link>
            <Link href="/join" className="hover:text-cream">הצטרפות ספקים</Link>
            <Link href="/employers" className="hover:text-cream">למעסיקים</Link>
            <Link href="/contact" className="hover:text-cream">יצירת קשר</Link>
            <Link href="/terms" className="hover:text-cream">תנאי שימוש</Link>
            <Link href="/privacy" className="hover:text-cream">פרטיות</Link>
          </nav>
          <div className="text-sm">
            <p className="text-gold">{he.poweredBy}</p>
            <p className="mt-2 text-cream/60">המחירים וההטבות מוצגים על בסיס הצעות שאושרו על ידי הספקים. תנאי מימוש, ביטול והחזר מפורטים בתנאי השימוש.</p>
          </div>
        </div>
        <p className="mt-8 border-t border-white/10 pt-4 text-xs text-cream/50">© {new Date().getFullYear()} {he.brand}. כל הזכויות שמורות.</p>
      </div>
    </footer>
  );
}
