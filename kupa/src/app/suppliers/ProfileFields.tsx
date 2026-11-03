'use client';
// שדות הפרופיל המלא של ספק. משמש את טופס ההצטרפות (ציבורי) ואת הפורטל (עריכה).
import { BUSINESS_TYPES } from '@/lib/supplier-consts';

export type ProfileValues = Partial<Record<string, string | number | null>>;
const s = (v: ProfileValues, k: string) => (v[k] == null ? '' : String(v[k]));

export default function ProfileFields({ v, withBasics = true }: { v: ProfileValues; withBasics?: boolean }) {
  return (<>
    {withBasics ? (
      <fieldset className="stack"><legend>העסק</legend>
        <div className="grid2">
          <div className="field"><label className="l" htmlFor="j-name">שם העסק (כפי שיוצג)</label><input id="j-name" name="name" type="text" required maxLength={120} defaultValue={s(v, 'name')} /></div>
          <div className="field"><label className="l" htmlFor="j-cat">תחום</label><input id="j-cat" name="category" type="text" required maxLength={60} defaultValue={s(v, 'category')} placeholder="קייטרינג לשבעה, מצבות, אוהלים וציוד, הסעות, פרחים, פינוי וניקיון…" /></div>
        </div>
        <div className="field"><label className="l" htmlFor="j-icon">אייקון</label>
          <select id="j-icon" name="icon" defaultValue={s(v, 'icon') || 'meal'}><option value="meal">ארוחות</option><option value="chairs">ציוד</option><option value="stone">מצבות</option><option value="home">בית</option><option value="flowers">פרחים</option><option value="transport">הסעות</option></select></div>
      </fieldset>
    ) : null}
    <fieldset className="stack"><legend>פרטי העסק</legend>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-legal">שם מלא / שם משפטי</label><input id="j-legal" name="legal_name" type="text" maxLength={160} defaultValue={s(v, 'legal_name')} placeholder="כפי שמופיע בחשבונית" /></div>
        <div className="field"><label className="l" htmlFor="j-bid">ח.פ / ע.מ</label><input id="j-bid" name="business_id" type="text" maxLength={20} dir="ltr" inputMode="numeric" defaultValue={s(v, 'business_id')} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-btype">סוג עסק</label>
          <select id="j-btype" name="business_type" defaultValue={s(v, 'business_type') || 'licensed'}>{Object.entries(BUSINESS_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label className="l" htmlFor="j-year">פועלים משנת</label><input id="j-year" name="founded_year" type="number" min={1950} max={2030} defaultValue={s(v, 'founded_year')} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="j-address">כתובת העסק</label><input id="j-address" name="address" type="text" maxLength={200} defaultValue={s(v, 'address')} placeholder="רחוב, מספר, עיר" /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-city">עיר</label><input id="j-city" name="city" type="text" maxLength={80} defaultValue={s(v, 'city')} /></div>
        <div className="field"><label className="l" htmlFor="j-areas">אזורי שירות</label><input id="j-areas" name="areas" type="text" maxLength={200} defaultValue={s(v, 'areas')} placeholder="ירושלים והסביבה, גוש דן, כל הארץ" /></div>
      </div>
    </fieldset>
    <fieldset className="stack"><legend>יצירת קשר</legend>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-contact">איש קשר</label><input id="j-contact" name="contact_name" type="text" maxLength={80} defaultValue={s(v, 'contact_name')} /></div>
        <div className="field"><label className="l" htmlFor="j-phone">טלפון (וואטסאפ) לפניות</label><input id="j-phone" name="phone" type="tel" required maxLength={30} dir="ltr" defaultValue={s(v, 'phone')} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-email">מייל</label><input id="j-email" name="email" type="email" maxLength={160} dir="ltr" defaultValue={s(v, 'email')} /></div>
        <div className="field"><label className="l" htmlFor="j-web">אתר</label><input id="j-web" name="website" type="url" maxLength={200} dir="ltr" defaultValue={s(v, 'website')} placeholder="https://" /></div>
      </div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-ig">אינסטגרם</label><input id="j-ig" name="instagram" type="text" maxLength={120} dir="ltr" defaultValue={s(v, 'instagram')} placeholder="@" /></div>
        <div className="field"><label className="l" htmlFor="j-fb">פייסבוק</label><input id="j-fb" name="facebook" type="text" maxLength={200} dir="ltr" defaultValue={s(v, 'facebook')} /></div>
      </div>
      <div className="field"><label className="l" htmlFor="j-hours">שעות פעילות</label><input id="j-hours" name="hours" type="text" maxLength={160} defaultValue={s(v, 'hours')} placeholder="א׳–ה׳ 8:00–20:00, ו׳ עד 13:00. זמינים גם בשבת לחירום" /></div>
    </fieldset>
    <fieldset className="stack"><legend>על העסק</legend>
      <div className="field"><label className="l" htmlFor="j-desc">תיאור (יוצג למשפחות)</label><textarea id="j-desc" name="description" maxLength={600} defaultValue={s(v, 'description')} /></div>
      <div className="field"><label className="l" htmlFor="j-services">מה אתם מציעים (שורה לכל שירות)</label><textarea id="j-services" name="services" maxLength={1000} defaultValue={s(v, 'services')} placeholder={'ארוחות חמות לשבעה\nכיבוד לאזכרה\nמשלוח עד הבית'} /></div>
      <div className="grid2">
        <div className="field"><label className="l" htmlFor="j-kosher">כשרות (אם רלוונטי)</label><input id="j-kosher" name="kosher" type="text" maxLength={120} defaultValue={s(v, 'kosher')} placeholder="רבנות ירושלים / בד״ץ / לא רלוונטי" /></div>
        <div className="field"><label className="l" htmlFor="j-delivery">משלוחים / הגעה</label><input id="j-delivery" name="delivery" type="text" maxLength={160} defaultValue={s(v, 'delivery')} placeholder="משלוח חינם מעל ₪500 / מגיעים עד הבית" /></div>
      </div>
      <div className="field"><label className="l" htmlFor="j-pay">אמצעי תשלום</label><input id="j-pay" name="payment_methods" type="text" maxLength={160} defaultValue={s(v, 'payment_methods')} placeholder="אשראי, העברה, ביט, תשלום מהקופה" /></div>
    </fieldset>
  </>);
}
