import { expect, test } from "@playwright/test";
import { e2eEnv } from "./env";
import {
  actor,
  createJob,
  expectStatus,
  loginWithCredentials,
  REAL_PNG,
  statusBadge,
  userRow,
  waitForHydration,
} from "./helpers";

const PASSWORD = "S3cret-Passw0rd-E2E";
const CONFLICT = "สถานะงานถูกเปลี่ยนแล้ว กรุณารีเฟรช";
const CLOSED_UPLOAD = "งานนี้ปิดแล้ว ไม่สามารถแนบไฟล์เพิ่ม";

/**
 * Fresh-authority boundaries asserted at the real UI/HTTP seam: role changes and
 * deactivations apply on the next request, two same-revision transitions cannot both win,
 * a closed job refuses stale uploads and stale workflow commands, and the audit page
 * never exposes typed passwords or hashes.
 */
test("การเปลี่ยนบทบาทมีผลกับเซสชันเดิมทันที และ audit ไม่มีรหัสผ่าน", async ({
  browser,
}) => {
  const admin = await actor(browser, "admin");
  const userContext = await browser.newContext();
  const user = await userContext.newPage();
  const email = `role-${Date.now()}@demo.local`;

  try {
    await admin.page.goto("/admin/users");
    await waitForHydration(admin.page);
    await admin.page.fill("#new-name", "ผู้ใช้เปลี่ยนบทบาท");
    await admin.page.fill("#new-email", email);
    await admin.page.fill("#new-password", PASSWORD);
    await admin.page.selectOption("#new-role", "TECHNICIAN");
    await admin.page.getByRole("button", { name: "สร้างผู้ใช้" }).click();
    await expect(admin.page.getByText("สร้างผู้ใช้เรียบร้อย")).toBeVisible();

    await loginWithCredentials(user, email, PASSWORD);
    // Technician: intake is off-limits.
    await user.goto("/jobs/new");
    await expect(user.getByText("ไม่พบข้อมูล")).toBeVisible();

    // Admin promotes the account; the existing session must see it on the next request.
    await userRow(admin.page, email).locator("select").selectOption("FRONT_DESK");
    await expect(userRow(admin.page, email).locator("select")).toHaveValue("FRONT_DESK");
    await expect(userRow(admin.page, email).locator("select")).toBeEnabled();
    await user.goto("/jobs/new");
    await expect(user.getByRole("heading", { name: "รับงานใหม่" })).toBeVisible();

    // Audit rows record the change without the typed password or its hash.
    await admin.page.goto("/admin/audit?action=user.create");
    const html = await admin.page.content();
    expect(html).not.toContain(PASSWORD);
    expect(html).not.toContain("passwordHash");
    expect(html).not.toMatch(/\$2[aby]\$/);
  } finally {
    await Promise.all([admin.context.close(), userContext.close()]);
  }
});

test("สองบริบทเปลี่ยนสถานะพร้อมกัน: สำเร็จหนึ่ง ครั้ง อีกครั้งถูกปฏิเสธ", async ({
  browser,
}) => {
  const front = await actor(browser, "frontdesk");
  const admin = await actor(browser, "admin");
  const techA = await actor(browser, "tech1");
  const techB = await actor(browser, "tech1");

  try {
    const { id, jobNo } = await createJob(front.page, {
      technicianLabel: "ช่างเอ",
    });
    await techA.page.goto(`/jobs/${id}`);
    await techB.page.goto(`/jobs/${id}`);
    await waitForHydration(techA.page);
    await waitForHydration(techB.page);
    await expectStatus(techA.page, "RECEIVED");
    await expectStatus(techB.page, "RECEIVED");

    // Both pages rendered the same revision: only one command can win.
    const never = new Promise<never>(() => {});
    const conflictA = techA.page
      .getByText(CONFLICT)
      .waitFor({ state: "visible" })
      .then(() => "A" as const)
      .catch(() => never);
    const conflictB = techB.page
      .getByText(CONFLICT)
      .waitFor({ state: "visible" })
      .then(() => "B" as const)
      .catch(() => never);
    await Promise.all([
      techA.page.getByRole("button", { name: "เริ่มตรวจสอบ" }).click(),
      techB.page.getByRole("button", { name: "เริ่มตรวจสอบ" }).click(),
    ]);
    // Exactly one context must report the refresh conflict.
    const loserId = await Promise.race([conflictA, conflictB]);
    const loserPage = loserId === "A" ? techA.page : techB.page;
    const winnerPage = loserId === "A" ? techB.page : techA.page;
    await expect(loserPage.getByText(CONFLICT)).toBeVisible();
    await expectStatus(winnerPage, "DIAGNOSING");
    await expect(statusBadge(loserPage, "RECEIVED")).toBeVisible();

    // Exactly one transition landed in the audit log.
    await admin.page.goto(`/admin/audit?jobNo=${encodeURIComponent(jobNo)}`);
    const started = admin.page
      .locator("tbody tr")
      .filter({ hasText: "job.start_diagnosis" });
    await expect(started).toHaveCount(1);
  } finally {
    await Promise.all([
      front.context.close(),
      admin.context.close(),
      techA.context.close(),
      techB.context.close(),
    ]);
  }
});

test("งานที่ถูกยกเลิกจากบริบทอื่น: อัปโหลดและคำสั่งค้างเก่าถูกปฏิเสธ", async ({
  browser,
}) => {
  const stale = await actor(browser, "frontdesk");
  const closer = await actor(browser, "frontdesk");
  const baseUrl = e2eEnv().baseUrl;

  try {
    const { id } = await createJob(stale.page);
    await expect(stale.page.locator('[data-testid="file-input"]')).toBeAttached();

    // A second context cancels the job while the first page still shows it as open.
    await closer.page.goto(`/jobs/${id}`);
    await waitForHydration(closer.page);
    await closer.page.getByRole("button", { name: "ยกเลิกงาน" }).click();
    await closer.page.fill("#cancel-reason", "ยกเลิกจากบริบทที่สอง");
    await closer.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expectStatus(closer.page, "CANCELLED");

    // Direct upload from the stale page is refused by the server.
    const upload = await stale.context.request.post(
      `${baseUrl}/api/jobs/${id}/attachments`,
      {
        multipart: {
          stage: "INTAKE",
          file: {
            name: "stale-intake.png",
            mimeType: "image/png",
            buffer: REAL_PNG.buffer,
          },
        },
      },
    );
    expect(upload.status()).toBe(400);
    const body: unknown = await upload.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("error" in body) ||
      typeof body.error !== "string"
    )
      throw new Error(`unexpected upload error body: ${JSON.stringify(body)}`);
    expect(body.error).toBe(CLOSED_UPLOAD);

    // A stale workflow command from the same page loses the revision race.
    await stale.page.getByRole("button", { name: "ยกเลิกงาน" }).click();
    await stale.page.fill("#cancel-reason", "คำสั่งค้างจากหน้าเก่า");
    await stale.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expect(stale.page.getByText(CONFLICT).first()).toBeVisible();
    await expectStatus(closer.page, "CANCELLED");
  } finally {
    await Promise.all([stale.context.close(), closer.context.close()]);
  }
});

test("งานเสร็จสิ้น: คำขออัปโหลดโดยตรงถูกปฏิเสธ และยอดชำระยังอยู่", async ({ browser }) => {
  const front = await actor(browser, "frontdesk");
  try {
    await front.page.goto("/jobs/list?status=COMPLETED&q=Inspiron");
    await front.page.locator("tbody a.mono").first().click();
    await expect(front.page.locator("h1")).toHaveText(/^RJ-\d{4}-\d{4}$/);
    await expectStatus(front.page, "COMPLETED");
    const id = new URL(front.page.url()).pathname.split("/").pop()!;
    const response = await front.context.request.post(
      `${e2eEnv().baseUrl}/api/jobs/${id}/attachments`,
      { multipart: { stage: "INTAKE", file: REAL_PNG } },
    );
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: CLOSED_UPLOAD });
    await front.page.reload();
    await expectStatus(front.page, "COMPLETED");
    await expect(front.page.locator('[data-testid="file-input"]')).toHaveCount(0);
    await expect(front.page.getByText(REAL_PNG.name, { exact: false })).toHaveCount(0);
    await expect(front.page.getByRole("heading", { name: "การชำระเงิน" })).toBeVisible();
  } finally {
    await front.context.close();
  }
});
