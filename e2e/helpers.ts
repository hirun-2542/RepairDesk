import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/** Seeded demo accounts (password `demo1234` for all of them). */
export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = {
  admin: { email: "admin@demo.local", label: "ผู้ดูแลระบบ" },
  frontdesk: { email: "frontdesk@demo.local", label: "หน้าร้าน" },
  tech1: { email: "tech1@demo.local", label: "ช่าง 1" },
  tech2: { email: "tech2@demo.local", label: "ช่าง 2" },
} as const;
export type DemoActor = keyof typeof DEMO_ACCOUNTS;

/**
 * Staff detail and tracking pages render one `<StatusBadge>` with `badge-lg st-<STATUS>`;
 * list/board pages render one per row, so the first match is the one under assertion.
 */
export function statusBadge(page: Page, status: string) {
  return page.locator(`.badge-lg.st-${status}`).first();
}
export async function expectStatus(page: Page, status: string) {
  await expect(statusBadge(page, status)).toBeVisible();
}

/** Waits until a job detail page is loaded (list pages never show a job number as `h1`). */
export async function expectJobDetail(page: Page) {
  await expect(page.locator("h1")).toHaveText(/^RJ-\d{4}-\d{4}$/);
}

/**
 * Cold dev routes compile their client bundles on the first request. Wait on public
 * browser load states, not React's private fiber properties, before interacting.
 */
export async function waitForHydration(page: Page) {
  await page.waitForLoadState("load", { timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
}

/** Opens a job detail page and waits until its client handlers are live. */
export async function openJob(page: Page, id: string) {
  await page.goto(`/jobs/${id}`);
  await waitForHydration(page);
}

/** Signs in through the real login form with one click on the demo account buttons. */
export async function login(page: Page, who: DemoActor) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: DEMO_ACCOUNTS[who].label, exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
}

/** Signs in with explicit credentials — used for accounts created during the run. */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
}

export type Actor = { context: BrowserContext; page: Page };

/** A separate browser context per actor, so sessions never leak between roles. */
export async function actor(browser: Browser, who: DemoActor): Promise<Actor> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, who);
  return { context, page };
}

let phoneCounter = 0;
/** Valid Thai mobile number that is unique inside the seeded dataset. */
export function uniquePhone() {
  phoneCounter += 1;
  const tail = String((Date.now() + phoneCounter * 7919) % 100_000_000).padStart(8, "0");
  return `08${tail}`;
}

export type IntakeInput = {
  phone?: string;
  name?: string;
  category?: "PHONE" | "COMPUTER" | "CAR" | "AIRCON";
  brand?: string;
  model?: string;
  symptom?: string;
  technicianLabel?: string;
};

/** Front-desk intake through the real form; returns the freshly created job identity. */
export async function createJob(page: Page, input: IntakeInput = {}) {
  const phone = input.phone ?? uniquePhone();
  await page.goto("/jobs/new");
  await expect(page.locator("h1")).toHaveText("รับงานใหม่");
  await page.fill("#phone", phone);
  await page.fill("#name", input.name ?? "ลูกค้าทดสอบ E2E");
  await page.selectOption("#category", input.category ?? "PHONE");
  await page.fill("#brand", input.brand ?? "Apple");
  await page.fill("#model", input.model ?? "iPhone 15");
  await page.fill("#symptom", input.symptom ?? "หน้าจอแตก ทัชไม่ติด");
  if (input.technicianLabel)
    await page.selectOption("#technicianId", { label: input.technicianLabel });
  await page.getByRole("button", { name: "บันทึกใบรับงาน" }).click();
  await expect(page.locator("h1")).toHaveText(/^RJ-\d{4}-\d{4}$/);
  await waitForHydration(page);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  const jobNo = (await page.locator("h1").innerText()).trim();
  return { id, jobNo, phone };
}

/** The tracking link input is filled with the absolute URL during hydration. */
export async function readTrackingUrl(page: Page) {
  const input = page.locator('[data-testid="tracking-link"]');
  await expect(input).toHaveValue(/^https?:\/\/.+\/track\/.+/);
  return (await input.inputValue()).trim();
}

export type UploadFile = { name: string; mimeType: string; buffer: Buffer };

/** Tiny valid 1×1 PNG — passes the server's byte-signature check. */
export const REAL_PNG: UploadFile = {
  name: "after-repair.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/** Picks the file input and waits for the upload request's response. */
export async function uploadAttachment(
  page: Page,
  file: UploadFile,
  stage?: string,
) {
  if (stage)
    await page.locator('[data-testid="stage-select"]').selectOption(stage);
  const response = page.waitForResponse(
    (res) =>
      res.url().includes("/attachments") && res.request().method() === "POST",
  );
  await page.locator('[data-testid="file-input"]').setInputFiles(file);
  return response;
}

/** Row of the users table that contains the given email. */
export function userRow(page: Page, email: string) {
  return page.locator("tbody tr").filter({ hasText: email });
}
