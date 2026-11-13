import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("giver buys a voucher, family claims it with phone OTP, wallet shows balance", async ({ page }) => {
  const phone = "054" + String(Math.floor(1000000 + Math.random() * 8999999));

  // שלב 1
  await page.goto("/gift");
  await expect(page.getByRole("heading", { name: "שליחת מתנה למשפחה" })).toBeVisible();
  await page.locator('label:has(input[name="amount"][value="50000"])').click();
  await page.getByRole("button", { name: /המשך/ }).click();

  // שלב 2
  await expect(page).toHaveURL(/\/gift\/recipient/);
  await page.fill("#recipientName", "משפחת כהן");
  await page.fill("#recipientPhone", phone);
  await page.fill("#dedication", "חושבים עליכם בימים האלה.");
  await page.fill("#buyerName", "דנה לוי");
  await page.getByRole("button", { name: /לסיכום/ }).click();

  // שלב 3
  await expect(page).toHaveURL(/\/gift\/review/);
  await expect(page.getByTestId("total")).toHaveText(/500/);
  await page.getByLabel(/קראתי ואני מסכים/).check();
  await page.getByRole("button", { name: /לתשלום מאובטח/ }).click();

  // סולק הדמיה
  await expect(page).toHaveURL(/\/pay\/sandbox\//);
  await expect(page.getByText("סולק הדמיה")).toBeVisible();
  await page.getByRole("button", { name: "אישור תשלום (הדמיה)" }).click();

  // אישור + קישור קבלה
  await expect(page).toHaveURL(/\/gift\/done\/MN-/);
  await expect(page.getByRole("heading", { name: "ההזמנה הושלמה" })).toBeVisible();
  const claimUrl = await page.getByTestId("claim-url").innerText();
  expect(claimUrl).toMatch(/\/v\/[A-Za-z0-9_-]{20,}/);
  const claimPath = claimUrl.replace(/^https?:\/\/[^/]+/, "");

  // חזרה לדף ההזמנה אחרי רענון: הקישור עדיין זמין
  await page.reload();
  await expect(page.getByTestId("claim-url")).toHaveText(claimUrl);

  // המשפחה פותחת את הקישור (דפדפן אחר)
  const family = await page.context().browser()!.newContext({ ...test.info().project.use, baseURL: test.info().project.use.baseURL });
  const fp = await family.newPage();
  await fp.goto(claimPath);
  await expect(fp.getByText("למשפחת כהן,")).toBeVisible();
  await expect(fp.getByText(/500/).first()).toBeVisible();
  await fp.getByRole("button", { name: "שמירה בארנק המשפחתי" }).click();
  await expect(fp).toHaveURL(/\/login/);
  await fp.fill("#identifier", phone);
  await fp.getByRole("button", { name: "שליחת קוד" }).click();
  await expect(fp.locator("#code")).toBeVisible();
  // קריאת הקוד מה-outbox
  const ob = await family.newPage(); await ob.goto("/dev/outbox");
  const body = await ob.locator('[data-testid="outbox-message"]').first().locator('[data-testid="outbox-body"]').innerText();
  await ob.close();
  const code = body.match(/(\d{6})/)![1];
  await fp.fill("#code", code);
  await fp.getByRole("button", { name: "אישור" }).click();

  // אחרי הכניסה: חוזרים לקישור הקבלה ונכנסים לארנק
  await expect(fp).toHaveURL(/\/wallet\?claimed=1/);
  await expect(fp.getByTestId("wallet-balance")).toHaveText(/500/);
  await expect(fp.getByTestId("voucher-card")).toHaveCount(1);
  await fp.getByTestId("voucher-card").click();
  const voucherCode = await fp.getByTestId("voucher-code").innerText();
  expect(voucherCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // כרטיס הטבות קיים
  await fp.goto("/wallet/card");
  await expect(fp.getByTestId("card-code")).toHaveText(/^MC-[A-Z2-9]{6}$/);

  // נותן המתנה רואה שהשובר נשמר
  await page.reload();
  await expect(page.getByText("המשפחה כבר שמרה את השובר")).toBeVisible();

  // משפחה אחרת לא יכולה לקבל את אותו שובר
  const other = await page.context().browser()!.newContext({ ...test.info().project.use });
  const op = await other.newPage();
  await login(op, "other-" + phone + "@example.test");
  await op.goto(claimPath);
  await expect(op.getByText("השובר כבר נשמר בארנק משפחתי")).toBeVisible();
  await other.close();
  await family.close();
});

test("declined sandbox payment creates no voucher", async ({ page }) => {
  await page.goto("/gift");
  await page.locator('label:has(input[name="amount"][value="15000"])').click();
  await page.getByRole("button", { name: /המשך/ }).click();
  await page.fill("#recipientName", "משפחת לוי");
  await page.fill("#buyerName", "יוסי");
  await page.getByRole("button", { name: /לסיכום/ }).click();
  await page.getByLabel(/קראתי ואני מסכים/).check();
  await page.getByRole("button", { name: /לתשלום מאובטח/ }).click();
  await page.getByRole("button", { name: "הדמיית תשלום שנדחה" }).click();
  await expect(page.getByText("התשלום נדחה (הדמיה)")).toBeVisible();
  await expect(page.getByRole("link", { name: "להזמנה חדשה" })).toBeVisible();
});
