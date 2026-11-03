import { headers } from 'next/headers';

/** כתובת האתר: מההגדרה, ואם אין — מהבקשה. בלי / בסוף. */
export async function siteUrl(): Promise<string> {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  if (env) return env;
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** שם המותג. מוגדר במקום אחד כדי שאפשר יהיה להחליף בלי לגעת בקוד. */
export const BRAND = process.env.NEXT_PUBLIC_BRAND || 'לצידכם';
/** המותג בצד המשפחה (למשל "אבלות ישראל" כשזה חלק מהאתר של אבלות ישראל). ברירת מחדל: BRAND. */
export const FAMILY_BRAND = process.env.NEXT_PUBLIC_FAMILY_BRAND || BRAND;
/** האתר הראשי שחוזרים אליו מצד המשפחה (למשל https://www.avlut.org.il). */
export const HOME_URL = process.env.NEXT_PUBLIC_HOME_URL || '/';
export const TAGLINE = 'כל התמיכה, במקום אחד';
/** שם המוצר של מרכז המשפחה ("לצידכם"), והסלוגן שלו. */
export const PRODUCT = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'לצידכם';
export const PRODUCT_TAGLINE = 'כל התמיכה, במקום אחד';
/** שם ברירת המחדל של הרכז/ת האישי/ת (אפשר לקבוע לכל משפחה בניהול). */
export const COORDINATOR_NAME = process.env.NEXT_PUBLIC_COORDINATOR_NAME || 'צוות הליווי';
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '';
/** required: תוספת התפעול נוספת לכל הפקדה. optional: המפקיד יכול לבטל אותה. */
export const FEE_MODE: 'required' | 'optional' = process.env.FEE_MODE === 'optional' ? 'optional' : 'required';
export const FEE_PCT = Math.max(0, Math.min(30, Number(process.env.FEE_PCT ?? 6) || 0));
