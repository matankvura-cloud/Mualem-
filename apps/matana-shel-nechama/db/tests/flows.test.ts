// בדיקות שכבת הנתונים: רכישה → תשלום הדמיה → קבלה → מימוש חלקי → כפילות → RLS → ביטול
// הרצה: node --import tsx --test db/tests/flows.test.ts
import { config } from "dotenv"; config({ path: ".env.local" }); config();
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, asAnon, asUser, asService } from "../../src/lib/db";

const PROVIDER_USER = "00000000-0000-4000-8000-000000000002"; // קייטרינג לדוגמה
const TENTS_USER = "00000000-0000-4000-8000-000000000003";    // אוהלים לדוגמה
const ADMIN_USER = "00000000-0000-4000-8000-000000000001";

async function newUser(email: string) {
  return asService(async (tx) => {
    const [u] = await tx`insert into auth.users (email, email_verified_at) values (${email}, now()) returning id`;
    await tx`insert into profiles (id) values (${u.id})`;
    return u.id as string;
  });
}

test("full voucher lifecycle", async (t) => {
  const idem = randomUUID();
  const created = await asAnon(async (tx) => {
    const [r] = await tx`select create_gift_order(${tx.json({
      amount_agorot: 50000, idempotency_key: idem, buyer_name: "דנה", buyer_phone: "0501234567",
      recipient_name: "משפחת כהן", recipient_phone: "050-7654321", dedication_he: "חושבים עליכם.",
    })}) as r`;
    return r.r;
  });
  assert.equal(created.existing, false);
  assert.match(created.order_no, /^MN-\d{4}-\d{6}$/);
  assert.ok(created.access_token);

  // אידמפוטנטיות ביצירה
  const again = await asAnon(async (tx) => (await tx`select create_gift_order(${tx.json({ amount_agorot: 50000, idempotency_key: idem, buyer_name: "x", recipient_name: "y" })}) as r`)[0].r);
  assert.equal(again.existing, true);
  assert.equal(again.order_id, created.order_id);

  // תשלום הדמיה
  const paid = await asAnon(async (tx) => (await tx`select sandbox_pay(${created.order_id}, ${created.access_token}, 'approve') as r`)[0].r);
  assert.equal(paid.status, "paid");
  assert.ok(paid.claim_token);
  const paidAgain = await asAnon(async (tx) => (await tx`select sandbox_pay(${created.order_id}, ${created.access_token}, 'approve') as r`)[0].r);
  assert.equal(paidAgain.already, true);
  assert.equal(paidAgain.claim_token, null);

  // טוקן שגוי
  await assert.rejects(asAnon((tx) => tx`select sandbox_pay(${created.order_id}, 'wrong', 'approve')`), /order_not_found/);

  // תצוגה מקדימה
  const peek = await asAnon(async (tx) => (await tx`select peek_claim(${paid.claim_token}) as r`)[0].r);
  assert.equal(peek.status, "pending");
  assert.equal(peek.recipient_name, "משפחת כהן");

  // קבלה ע"י משפחה
  const family = await newUser(`family-${idem}@matana.test`);
  const claim = await asUser(family, async (tx) => (await tx`select claim_voucher(${paid.claim_token}, null) as r`)[0].r);
  assert.equal(claim.already, false);
  const claimAgain = await asUser(family, async (tx) => (await tx`select claim_voucher(${paid.claim_token}, null) as r`)[0].r);
  assert.equal(claimAgain.already, true);

  // משפחה אחרת לא יכולה לקבל
  const other = await newUser(`other-${idem}@matana.test`);
  await assert.rejects(asUser(other, (tx) => tx`select claim_voucher(${paid.claim_token}, null)`), /claimed_by_other_wallet/);

  // RLS: בעלת הארנק רואה את השובר, זרה לא
  const mine = await asUser(family, (tx) => tx`select code, balance_agorot, status from vouchers`);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].status, "active");
  const theirs = await asUser(other, (tx) => tx`select id from vouchers`);
  assert.equal(theirs.length, 0);
  const card = await asUser(family, (tx) => tx`select card_code from benefit_cards`);
  assert.match(card[0].card_code, /^MC-[A-Z2-9]{6}$/);
  const code: string = mine[0].code;

  // ספק: בדיקה ומימוש חלקי
  const look = await asUser(PROVIDER_USER, async (tx) => (await tx`select lookup_voucher(${code.toLowerCase().replace(/-/g, "")}) as r`)[0].r);
  assert.equal(look.eligible, true);
  assert.equal(look.balance_agorot, 50000);
  const idem1 = randomUUID();
  const r1 = await asUser(PROVIDER_USER, async (tx) => (await tx`select redeem_voucher(${code}, 30000, ${idem1}, 'מגשי אירוח') as r`)[0].r);
  assert.equal(r1.balance_agorot, 20000);
  assert.equal(r1.commission_agorot, 3000); // 10%
  const r1b = await asUser(PROVIDER_USER, async (tx) => (await tx`select redeem_voucher(${code}, 30000, ${idem1}, null) as r`)[0].r);
  assert.equal(r1b.already, true);
  assert.equal(r1b.balance_agorot, 20000);
  await assert.rejects(asUser(PROVIDER_USER, (tx) => tx`select redeem_voucher(${code}, 30000, ${randomUUID()}, null)`), /insufficient_balance/);

  // ספק שני מממש את היתרה (ריבוי ספקים)
  const r2 = await asUser(TENTS_USER, async (tx) => (await tx`select redeem_voucher(${code}, 20000, ${randomUUID()}, null) as r`)[0].r);
  assert.equal(r2.balance_agorot, 0);
  const after = await asUser(family, (tx) => tx`select status, balance_agorot from vouchers`);
  assert.equal(after[0].status, "redeemed");
  await assert.rejects(asUser(TENTS_USER, (tx) => tx`select redeem_voucher(${code}, 100, ${randomUUID()}, null)`), /voucher_not_active/);

  // ledger: 1 הנפקה + 2 מימושים, יתרה סופית 0
  const ledger = await asUser(family, (tx) => tx`select entry, amount_agorot, balance_after_agorot from voucher_ledger order by id`);
  assert.deepEqual(ledger.map((l) => [l.entry, l.amount_agorot, l.balance_after_agorot]), [["issue", 50000, 50000], ["redeem", -30000, 20000], ["redeem", -20000, 0]]);
  await assert.rejects(asService((tx) => tx`delete from voucher_ledger`), /append-only/);

  // משפחה לא יכולה לממש, זר לא יכול לקרוא redemptions
  await assert.rejects(asUser(family, (tx) => tx`select redeem_voucher(${code}, 100, ${randomUUID()}, null)`), /not_a_provider/);
  assert.equal((await asUser(other, (tx) => tx`select id from redemptions`)).length, 0);
  assert.equal((await asUser(PROVIDER_USER, (tx) => tx`select id from redemptions`)).length >= 1, true);

  // מנהל: ביטול מימוש מחזיר יתרה; לא-מנהל נדחה
  await assert.rejects(asUser(PROVIDER_USER, (tx) => tx`select reverse_redemption(${r1.redemption_id}, 'x')`), /forbidden/);
  const rev = await asUser(ADMIN_USER, async (tx) => (await tx`select reverse_redemption(${r1.redemption_id}, 'טעות בסכום') as r`)[0].r);
  assert.equal(rev.balance_agorot, 30000);
  const audit = await asUser(ADMIN_USER, (tx) => tx`select action from audit_log where entity_id = ${claim.voucher_id} order by id`);
  assert.deepEqual(audit.map((a) => a.action), ["voucher.issued", "voucher.claimed", "voucher.redeemed", "voucher.redeemed"]);
  assert.equal((await asUser(family, (tx) => tx`select id from audit_log`)).length, 0);

  t.diagnostic(`order ${created.order_no}, voucher ${code}`);
});

test("scope-limited voucher rejects non-matching provider", async () => {
  const [cat] = await asAnon((tx) => tx`select id from categories where slug = 'equipment'`);
  const created = await asAnon(async (tx) => (await tx`select create_gift_order(${tx.json({ amount_agorot: 15000, idempotency_key: randomUUID(), buyer_name: "א", recipient_name: "ב", scope_category_id: cat.id })}) as r`)[0].r);
  const paid = await asAnon(async (tx) => (await tx`select sandbox_pay(${created.order_id}, ${created.access_token}, 'approve') as r`)[0].r);
  const family = await newUser(`scope-${randomUUID()}@matana.test`);
  await asUser(family, (tx) => tx`select claim_voucher(${paid.claim_token}, 'משפחת לוי')`);
  const [v] = await asUser(family, (tx) => tx`select code from vouchers`);
  const look = await asUser(PROVIDER_USER, async (tx) => (await tx`select lookup_voucher(${v.code}) as r`)[0].r);
  assert.equal(look.eligible, false);
  await assert.rejects(asUser(PROVIDER_USER, (tx) => tx`select redeem_voucher(${v.code}, 100, ${randomUUID()}, null)`), /voucher_scope_mismatch/);
  const ok = await asUser(TENTS_USER, async (tx) => (await tx`select redeem_voucher(${v.code}, 15000, ${randomUUID()}, null) as r`)[0].r);
  assert.equal(ok.balance_agorot, 0);
});

test("declined sandbox payment issues no voucher; invalid amounts rejected", async () => {
  const created = await asAnon(async (tx) => (await tx`select create_gift_order(${tx.json({ amount_agorot: 30000, idempotency_key: randomUUID(), buyer_name: "א", recipient_name: "ב" })}) as r`)[0].r);
  const res = await asAnon(async (tx) => (await tx`select sandbox_pay(${created.order_id}, ${created.access_token}, 'decline') as r`)[0].r);
  assert.equal(res.status, "failed");
  const v = await asUser(ADMIN_USER, (tx) => tx`select id from vouchers where order_id = ${created.order_id}`);
  assert.equal(v.length, 0);
  await assert.rejects(asAnon((tx) => tx`select create_gift_order(${tx.json({ amount_agorot: 4900, idempotency_key: randomUUID(), buyer_name: "א", recipient_name: "ב" })})`), /invalid_amount/);
  await assert.rejects(asAnon((tx) => tx`select create_gift_order(${tx.json({ amount_agorot: 15050, idempotency_key: randomUUID(), buyer_name: "א", recipient_name: "ב" })})`), /invalid_amount/);
  // אורח לא קורא טבלאות כספיות
  assert.equal((await asAnon((tx) => tx`select id from orders`)).length, 0);
  assert.equal((await asAnon((tx) => tx`select id from vouchers`)).length, 0);
  await assert.rejects(asAnon((tx) => tx`insert into vouchers (code, order_id, initial_agorot, balance_agorot) values ('X', ${created.order_id}, 1, 1)`), /permission denied/);
});

test("public catalog is readable; unapproved providers hidden", async () => {
  const cats = await asAnon((tx) => tx`select slug from categories order by sort_order`);
  assert.equal(cats.length, 6);
  const app = await asAnon(async (tx) => (await tx`select apply_as_provider(${tx.json({ display_name: "פרחי בדיקה", contact_email: "flowers@test.test", phone: "0521111111", category_ids: [] })}) as r`)[0].r);
  const visible = await asAnon((tx) => tx`select id from providers where id = ${app.provider_id}`);
  assert.equal(visible.length, 0);
  const adminSees = await asUser(ADMIN_USER, (tx) => tx`select status from providers where id = ${app.provider_id}`);
  assert.equal(adminSees[0].status, "applied");
  await asUser(ADMIN_USER, (tx) => tx`select admin_review_provider(${app.provider_id}, 'approved', 12, 'flowers@test.test')`);
  const nowVisible = await asAnon((tx) => tx`select slug from providers where id = ${app.provider_id}`);
  assert.equal(nowVisible.length, 1);
  const member = await asService((tx) => tx`select pm.role from provider_members pm join auth.users u on u.id = pm.user_id where u.email = 'flowers@test.test'`);
  assert.equal(member[0].role, "owner");
  // ניקוי: הספק הזמני לא נשאר בקטלוג
  await asService((tx) => tx`delete from providers where id = ${app.provider_id}`);
});

test.after(async () => { await sql.end(); });
