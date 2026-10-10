// Captures screenshots of every key screen/state. Usage: npm run build && npx vite preview --port 5174 & node scripts/shots.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5174";
const OUT = new URL("../../screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome` });

async function shot(name, hash, { w = 1440, h = 900, full = false, act } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "th-TH", timezoneId: "Asia/Bangkok", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/#${hash}${hash.includes("?") ? "&" : "?"}nodock=1`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  if (act) await act(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) errors.push(`horizontal overflow ${overflow}px`);
  if (full) { // 100vh sidebar must span the whole captured page, like a sticky sidebar does while scrolling
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: w, height });
  }
  await page.screenshot({ path: `${OUT}${process.env.SHOT_PREFIX ?? ""}${name}.png`, fullPage: full });
  console.log(errors.length ? `✗ ${name} errors: ${errors.join(" | ")}` : `✓ ${name}`);
  await ctx.close();
}

await shot("01-login", "/login");
await shot("02-board-frontdesk", "/jobs?as=front", { full: true });
await shot("02b-board-wide-1920", "/jobs?as=front", { w: 1920, h: 700 });
await shot("02c-board-tablet-rail-1024", "/jobs?as=front", { w: 1024, h: 700 });
await shot("02d-board-mobile-topbar-390", "/jobs?as=admin", { w: 390, h: 700 });
await shot("03-board-technician", "/jobs?as=tech1", { h: 700 });
await shot("04-list-frontdesk", "/jobs/list?as=front");
await shot("05-new-job-validation", "/jobs/new?as=front&prefill=1", { full: true, act: (p) => p.getByRole("button", { name: "บันทึกใบรับงาน" }).click() });
await shot("06-job-quoted-rejected-frontdesk", "/jobs/j4?as=front", { full: true });
await shot("07-quote-dialog-technician", "/jobs/j3?as=tech2&dialog=quote", { act: async (p) => {
  await p.getByLabel("ผลการตรวจสอบ").fill("ลูกหมากล่างด้านหน้าขวาหลวมและยางกันฝุ่นขาด");
  await p.getByLabel("รายการ", { exact: true }).fill("เปลี่ยนลูกหมากล่างหน้าขวา");
  await p.getByLabel("ราคาต่อหน่วย (บาท)").fill("2500");
  await p.getByRole("button", { name: "เพิ่มรายการ" }).click();
  await p.getByLabel("รายการ", { exact: true }).nth(1).fill("ค่าแรง + ตั้งศูนย์");
  await p.getByLabel("ราคาต่อหน่วย (บาท)").nth(1).fill("800");
  await p.locator("select[aria-label=ประเภท]").first().selectOption("PART");
  await p.locator("select[aria-label=ประเภท]").nth(1).selectOption("LABOR");
} });
await shot("08-job-repairing-tech-guard", "/jobs/j7?as=tech1", { full: true });
await shot("09-complete-dialog-transfer-no-slip", "/jobs/j9?as=front&dialog=complete", { act: (p) => p.getByRole("button", { name: "โอนเงิน" }).click() });
await shot("10-cancel-dialog", "/jobs/j4?as=front&dialog=cancel", { act: async (p) => { await p.getByLabel("ค่าตรวจเช็ค (บาท)").fill("300"); } });
await shot("11-job-completed-admin", "/jobs/j11?as=admin", { full: true });
await shot("12-job-forbidden-technician", "/jobs/j6?as=tech1");
await shot("13-customer-tracking-mobile-pending", "/track/tk05Z8qLm4VnR2xYc7Hb1PdKfS9aW3", { w: 390, h: 844 });
await shot("13b-customer-tracking-mobile-pending-full", "/track/tk05Z8qLm4VnR2xYc7Hb1PdKfS9aW3", { w: 390, h: 844, full: true, act: (p) => p.addStyleTag({ content: ".track-bar{position:static!important}" }) });
await shot("14-customer-tracking-mobile-completed", "/track/tk11Z8qLm4VnR2xYc7Hb1PdKfS9aW3", { w: 390, h: 844, full: true });
await shot("15-customer-tracking-invalid", "/track/xxxx", { w: 390, h: 700 });
await shot("16-receipt", "/jobs/j11/receipt?as=front", { full: true });
await shot("17-admin-users", "/admin/users?as=admin");
await shot("18-admin-audit", "/admin/audit?as=admin", { full: true });
await shot("19-screen-states", "/states?as=admin", { full: true });
await shot("20-design-system", "/design-system?as=admin", { full: true });
await shot("21-job-mobile-staff", "/jobs/j7?as=tech1", { w: 390, h: 844, full: true });
await shot("22-board-loading", "/jobs?as=front&state=loading", { h: 600 });
await shot("23-list-empty", "/jobs/list?as=front&q=zzzz", { h: 600 });
await shot("24-login-error", "/login?error=1", { h: 800 });
await browser.close();
