-- seed לסביבת פיתוח/בדיקה. אידמפוטנטי.
-- ספקים כאן מסומנים is_demo=true ומוצגים תמיד עם תווית "ספק לדוגמה". אין להריץ בפיילוט.

insert into categories (slug, name_he, blurb_he, icon, sort_order) values
  ('catering',  'קייטרינג וארוחות לשבעה', 'מגשי אירוח, ארוחות חמות ומשלוחים לבית האבלים', 'plate', 1),
  ('equipment', 'אוהלים וציוד לשבעה',     'אוהלים, כיסאות, שולחנות, מיזוג ותאורה', 'tent', 2),
  ('home',      'ניקיון ועזרה בבית',      'ניקיון, סידור הבית וסיוע יומיומי', 'home', 3),
  ('memorial',  'מצבות והנצחה',           'מצבות, חריטה, לוחות זיכרון', 'stone', 4),
  ('flowers',   'פרחים ומוצרי זיכרון',    'זרים, נרות נשמה, אלבומים וספרי זיכרון', 'flower', 5),
  ('shloshim',  'יום השלושים ואזכרות',    'אירוח, הסעות ושירותים לאזכרות', 'calendar', 6)
on conflict (slug) do update set name_he = excluded.name_he, blurb_he = excluded.blurb_he, icon = excluded.icon, sort_order = excluded.sort_order;

-- משתמשי בדיקה (התחברות עם קוד חד-פעמי שמופיע ב-/dev/outbox)
insert into auth.users (id, email, email_verified_at) values
  ('00000000-0000-4000-8000-000000000001', 'admin@matana.test', now()),
  ('00000000-0000-4000-8000-000000000002', 'provider@matana.test', now()),
  ('00000000-0000-4000-8000-000000000003', 'provider2@matana.test', now())
on conflict (id) do nothing;
insert into profiles (id, full_name) values
  ('00000000-0000-4000-8000-000000000001', 'מנהל/ת מערכת (בדיקה)'),
  ('00000000-0000-4000-8000-000000000002', 'ספק הדגמה — קייטרינג'),
  ('00000000-0000-4000-8000-000000000003', 'ספק הדגמה — אוהלים')
on conflict (id) do nothing;
insert into user_roles (user_id, role) values
  ('00000000-0000-4000-8000-000000000001', 'admin'),
  ('00000000-0000-4000-8000-000000000002', 'provider'),
  ('00000000-0000-4000-8000-000000000003', 'provider')
on conflict do nothing;

-- ספקי הדגמה
insert into providers (id, slug, display_name, legal_name, contact_name, contact_email, phone_e164, city, service_area, description_he, kosher_note, status, is_demo, approved_at) values
  ('10000000-0000-4000-8000-000000000001', 'demo-catering', 'קייטרינג לדוגמה', 'קייטרינג לדוגמה בע"מ (הדגמה)', 'איש קשר', 'provider@matana.test', '+972500000001', 'ירושלים', 'ירושלים והסביבה',
   'ספק הדגמה לסביבת הבדיקה. מגשי אירוח וארוחות חמות לבית האבלים, משלוח עד הבית.', 'כשר למהדרין (הדגמה)', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000002', 'demo-tents', 'אוהלים וציוד לדוגמה', null, 'איש קשר', 'provider2@matana.test', '+972500000002', 'תל אביב', 'מרכז', 
   'ספק הדגמה לסביבת הבדיקה. אוהלים, כיסאות ושולחנות לשבעה, הקמה ופירוק.', null, 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000003', 'demo-home', 'עזרה בבית לדוגמה', null, 'איש קשר', 'demo3@matana.test', '+972500000003', 'חיפה', 'צפון',
   'ספק הדגמה לסביבת הבדיקה. ניקיון וסידור הבית לפני ואחרי השבעה.', null, 'approved', true, now())
on conflict (id) do nothing;

insert into provider_categories (provider_id, category_id)
select p.id, c.id from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'catering'), ('10000000-0000-4000-8000-000000000001', 'shloshim'),
  ('10000000-0000-4000-8000-000000000002', 'equipment'),
  ('10000000-0000-4000-8000-000000000003', 'home')) as v(pid, slug)
join providers p on p.id = v.pid join categories c on c.slug = v.slug
on conflict do nothing;

insert into provider_members (provider_id, user_id, role) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'owner'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'owner')
on conflict do nothing;

insert into provider_services (id, provider_id, category_id, title_he, description_he, price_agorot, price_note_he, status, sort_order)
select v.id::uuid, v.pid::uuid, c.id, v.title, v.descr, v.price, v.note, 'approved', v.ord from (values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'catering', 'מגשי אירוח לשבעה', 'מגש מאפים, ירקות וממרחים ל-20 איש', 45000, null, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'catering', 'ארוחה חמה משפחתית', 'ארוחת ערב ל-10 סועדים, משלוח כלול', 65000, null, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'equipment', 'אוהל 4×8 כולל כיסאות', 'הקמה ופירוק, 40 כיסאות, 4 שולחנות', 120000, 'לשבוע', 1),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'equipment', 'כיסאות ושולחנות בלבד', '40 כיסאות, 4 שולחנות', 45000, 'לשבוע', 2),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'home', 'ניקיון יסודי לפני השבעה', 'עד 4 חדרים', null, 'לפי הצעת מחיר', 1)
) as v(id, pid, slug, title, descr, price, note, ord) join categories c on c.slug = v.slug
on conflict (id) do nothing;

insert into benefits (id, provider_id, title_he, terms_he, kind, value, max_per_card, status) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10% הנחה למחזיקי כרטיס', 'על כל הזמנה לשבעה. לא כולל משלוח. הדגמה.', 'percent', 10, 3, 'approved'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '15% הנחה על אוהל לשבעה', 'בהזמנה מראש. הדגמה.', 'percent', 15, 1, 'approved')
on conflict (id) do nothing;

insert into commission_rules (provider_id, category_id, pct, note)
select null, c.id, 8, 'עמלת ברירת מחדל לקטגוריה (הדגמה)' from categories c where c.slug = 'memorial'
on conflict (provider_id, category_id) do nothing;
