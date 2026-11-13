import { expect, type Page } from "@playwright/test";

/** קורא את הקוד האחרון שנשלח לנמען מתיבת ההודעות לפיתוח */
export async function readOtp(page: Page, recipient: string): Promise<string> {
  const ctx = page.context();
  const p = await ctx.newPage();
  await p.goto("/dev/outbox");
  const msg = p.locator('[data-testid="outbox-message"]', { hasText: recipient }).first();
  await expect(msg).toBeVisible();
  const body = await msg.locator('[data-testid="outbox-body"]').innerText();
  await p.close();
  const m = body.match(/(\d{6})/);
  if (!m) throw new Error("no otp in: " + body);
  return m[1];
}

export async function login(page: Page, identifier: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.fill("#identifier", identifier);
  await page.getByRole("button", { name: "שליחת קוד" }).click();
  await expect(page.locator("#code")).toBeVisible();
  const code = await readOtp(page, identifier.startsWith("0") ? "+972" + identifier.replace(/\D/g, "").slice(1) : identifier);
  await page.fill("#code", code);
  await page.getByRole("button", { name: "אישור" }).click();
  // ממתינים לסיום הפעולה בשרת (ניווט מחוץ לעמוד הכניסה) לפני שממשיכים
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

export async function logout(page: Page) {
  await page.goto("/");
  const btn = page.getByRole("button", { name: "יציאה" });
  if (await btn.count()) await btn.first().click();
}
