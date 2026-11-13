import { test, expect, type Page, type Browser } from "@playwright/test";
import { login } from "./helpers";

const SHOTS = process.env.E2E_SHOTS_DIR;
async function shot(page: Page, name: string) { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); }

async function buyVoucher(page: Page, amountAgorot: number, recipient: string) {
  await page.goto("/gift");
  await page.locator(`label:has(input[name="amount"][value="${amountAgorot}"])`).click();
  await page.getByRole("button", { name: /המשך/ }).click();
  await page.fill("#recipientName", recipient);
  await page.fill("#buyerName", "נותן הבדיקה");
  await page.getByRole("button", { name: /לסיכום/ }).click();
  await page.getByLabel(/קראתי ואני מסכים/).check();
  await page.getByRole("button", { name: /לתשלום מאובטח/ }).click();
  await page.getByRole("button", { name: "אישור תשלום (הדמיה)" }).click();
  await expect(page).toHaveURL(/\/gift\/done\//);
  const url = await page.getByTestId("claim-url").innerText();
  return url.replace(/^https?:\/\/[^/]+/, "");
}

async function newContext(browser: Browser) { return browser.newContext({ ...test.info().project.use }); }

test("partial redemptions by two providers, family history, admin reversal", async ({ page, browser }) => {
  const claimPath = await buyVoucher(page, 50000, "משפחת ישראלי");

  // משפחה מקבלת (אימייל)
  const familyEmail = `family-${Date.now()}@example.test`;
  const fam = await newContext(browser); const fp = await fam.newPage();
  await login(fp, familyEmail, `${claimPath}?claim=1`);
  await expect(fp).toHaveURL(/\/wallet\?claimed=1/);
  await fp.getByTestId("voucher-card").click();
  const code = await fp.getByTestId("voucher-code").innerText();
  await shot(fp, "wallet-voucher");

  // ספק 1 מממש 300 מתוך 500
  const prov = await newContext(browser); const pp = await prov.newPage();
  await login(pp, "provider@matana.test");
  await expect(pp).toHaveURL(/\/provider/);
  await shot(pp, "provider-dashboard");
  await pp.goto("/provider/redeem");
  await pp.fill('input[name="code"]', code.toLowerCase());
  await pp.getByRole("button", { name: "בדיקה" }).first().click();
  await expect(pp.getByTestId("voucher-lookup")).toContainText("ניתן למימוש אצלכם");
  await shot(pp, "provider-lookup");
  await pp.fill("#amount", "300");
  await pp.fill("#note", "מגשי אירוח");
  await pp.getByRole("button", { name: "אישור מימוש" }).click();
  await expect(pp.getByTestId("redeem-done")).toContainText("המימוש נרשם");
  await expect(pp.getByTestId("redeem-done")).toContainText("200");
  await shot(pp, "provider-redeem-done");

  // ניסיון לממש יותר מהיתרה
  await pp.goto(`/provider/redeem?code=${code}`);
  await pp.fill("#amount", "300");
  await pp.getByRole("button", { name: "אישור מימוש" }).click();
  await expect(pp.getByText("הסכום גבוה מהיתרה בשובר.")).toBeVisible();

  // ספק 2 מממש את היתרה
  const prov2 = await newContext(browser); const p2 = await prov2.newPage();
  await login(p2, "provider2@matana.test");
  await p2.goto(`/provider/redeem?code=${code}`);
  await p2.fill("#amount", "200");
  await p2.getByRole("button", { name: "אישור מימוש" }).click();
  await expect(p2.getByTestId("redeem-done")).toContainText("0");
  // שובר שנוצל אינו ניתן למימוש נוסף
  await p2.goto(`/provider/redeem?code=${code}`);
  await expect(p2.getByTestId("voucher-lookup")).toContainText("נוצל במלואו");

  // המשפחה רואה יתרה 0 והיסטוריה
  await fp.goto("/wallet");
  await expect(fp.getByTestId("wallet-balance")).toHaveText(/0/);
  await fp.getByTestId("voucher-card").click();
  await expect(fp.getByText("מימוש · קייטרינג לדוגמה")).toBeVisible();
  await expect(fp.getByText("מימוש · אוהלים וציוד לדוגמה")).toBeVisible();
  await shot(fp, "wallet-history");

  // מנהל: מבטל מימוש, היתרה חוזרת
  const adm = await newContext(browser); const ap = await adm.newPage();
  await login(ap, "admin@matana.test");
  await expect(ap).toHaveURL(/\/admin/);
  await shot(ap, "admin-dashboard");
  await ap.goto("/admin/redemptions");
  const row = ap.locator("tr", { hasText: code }).filter({ hasText: "אוהלים וציוד לדוגמה" });
  await row.locator('input[name="reason"]').fill("טעות בסכום");
  await row.getByRole("button", { name: "ביטול מימוש" }).click();
  await expect(ap.getByText("בוצע.")).toBeVisible();
  await fp.goto("/wallet");
  await expect(fp.getByTestId("wallet-balance")).toHaveText(/200/);
  // יומן ביקורת
  await ap.goto("/admin/audit?q=redemption.reversed");
  await expect(ap.locator("tbody tr").first()).toContainText("redemption.reversed");
  await shot(ap, "admin-audit");

  // ספק לא יכול לגשת לניהול; משפחה לא לפורטל ספק
  await pp.goto("/admin"); await expect(pp).toHaveURL(/\/login\?denied=admin/);
  await fp.goto("/provider"); await expect(fp).toHaveURL(/\/provider\/none/);
  await Promise.all([fam.close(), prov.close(), prov2.close(), adm.close()]);
});

test("provider applies, admin approves, provider adds a service that becomes public after approval", async ({ page, browser }) => {
  const stamp = Date.now();
  const email = `newprov-${stamp}@example.test`;
  const name = `פרחי נחמה ${stamp}`;
  await page.goto("/join");
  await page.fill("#display_name", name);
  await page.fill("#contact_email", email);
  await page.fill("#phone", "052-1234567");
  await page.fill("#city", "חיפה");
  await page.getByLabel("פרחים ומוצרי זיכרון").check();
  await page.getByLabel(/אני מאשר\/ת שהפרטים נכונים/).check();
  await page.getByRole("button", { name: "שליחת בקשה" }).click();
  await expect(page.getByText("הבקשה התקבלה")).toBeVisible();
  // לא מופיע בקטלוג לפני אישור
  await page.goto("/catalog"); await expect(page.getByText(name)).toHaveCount(0);

  const adm = await newContext(browser); const ap = await adm.newPage();
  await login(ap, "admin@matana.test");
  await ap.goto("/admin/providers?status=applied");
  await ap.getByRole("link", { name }).click();
  await ap.selectOption("#status", "approved");
  await ap.fill("#commission_pct", "12");
  await ap.fill("#member_email", email);
  await ap.getByRole("button", { name: "שמירה" }).first().click();
  await expect(ap.getByText("נשמר.")).toBeVisible();
  await shot(ap, "admin-provider");

  // הספק החדש נכנס ומוסיף שירות
  const prov = await newContext(browser); const pp = await prov.newPage();
  await login(pp, email);
  await expect(pp).toHaveURL(/\/provider$/);
  await pp.goto("/provider/services");
  await pp.fill("#title_he", "זר ניחומים");
  await pp.fill("#price", "180");
  await pp.getByRole("button", { name: "הוספה" }).click();
  await expect(pp.getByText("נשמר ונשלח לאישור.")).toBeVisible();
  await shot(pp, "provider-services");
  // לא ציבורי לפני אישור
  await page.goto("/catalog?category=flowers");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByText("זר ניחומים")).toHaveCount(0);
  // מנהל מאשר
  await ap.goto("/admin/catalog");
  const row = ap.locator("tr", { hasText: "זר ניחומים" });
  await row.getByRole("button", { name: "אישור" }).click();
  await expect(ap.getByText("נשמר.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("זר ניחומים")).toBeVisible();
  await expect(page.getByText(/180/)).toBeVisible();
  await Promise.all([adm.close(), prov.close()]);
});
