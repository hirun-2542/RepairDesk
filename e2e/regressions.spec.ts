import { expect, test, type Page } from "@playwright/test";
import {
  actor,
  createJob,
  expectJobDetail,
  expectStatus,
  readTrackingUrl,
  waitForHydration,
} from "./helpers";

const MOBILE = { width: 390, height: 844 };

async function overflowX(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** At mobile width the sidebar becomes the top bar; it must render and stay a bar. */
async function expectTopbarIsABar(page: Page, where: string) {
  const sidebar = page.locator(".sidebar");
  await expect(sidebar, `${where}: staff shell must render`).toBeVisible();
  const box = await sidebar.boundingBox();
  expect(box, `${where}: top bar has no box`).not.toBeNull();
  expect(Math.round(box!.height), `${where}: top bar must not stretch`).toBeLessThanOrEqual(64);
  expect(await overflowX(page), `${where}: horizontal overflow`).toBeLessThanOrEqual(2);
}

/**
 * Regression guards for two UI defects found in visual review:
 *  1. at mobile width a short or access-denied staff page stretched the top bar to the
 *     full page height because the app grid had no row sizing,
 *  2. a cancelled job's public tracking progress dropped the diagnosis/quote history.
 */
test("แถบด้านบนบนมือถือไม่ยืดในหน้าที่สั้นหรือถูกปฏิเสธสิทธิ์", async ({
  browser,
}) => {
  const front = await actor(browser, "frontdesk");
  const tech2 = await actor(browser, "tech2");
  try {
    // A short staff page (empty search result) keeps the shell compact.
    await front.page.setViewportSize(MOBILE);
    await front.page.goto("/jobs/list?q=zzz-no-such-job");
    await waitForHydration(front.page);
    await expect(front.page.getByText("ไม่พบงานที่ตรงกับเงื่อนไข")).toBeVisible();
    await expectTopbarIsABar(front.page, "short staff page");

    // A technician opening another technician's job gets the private not-found page,
    // which must still be rendered inside the compact staff shell.
    const { id } = await createJob(front.page, { technicianLabel: "ช่างเอ" });
    await tech2.page.setViewportSize(MOBILE);
    await tech2.page.goto(`/jobs/${id}`);
    await expect(tech2.page.getByText("ไม่พบข้อมูล")).toBeVisible();
    await expectTopbarIsABar(tech2.page, "denied staff page");

    // A role-denied route must not stretch a bar either (when the shell is used).
    await tech2.page.goto("/jobs/new");
    await expect(tech2.page.getByText("ไม่พบข้อมูล")).toBeVisible();
    const deniedSidebar = tech2.page.locator(".sidebar");
    if (await deniedSidebar.count()) await expectTopbarIsABar(tech2.page, "role-denied page");
    else expect(await overflowX(tech2.page)).toBeLessThanOrEqual(2);
  } finally {
    await Promise.all([front.context.close(), tech2.context.close()]);
  }
});

test("งานที่ถูกยกเลิก: หน้าลูกค้าแสดงประวัติครบถึงขั้นที่เกิดขึ้นจริง", async ({
  browser,
}) => {
  const front = await actor(browser, "frontdesk");
  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();

  try {
    // Seeded job 12 was diagnosed and quoted before the customer refused and it was cancelled.
    await front.page.goto("/jobs/list?status=CANCELLED");
    await front.page.locator("tbody tr a.mono").first().click();
    await expectJobDetail(front.page);
    await expectStatus(front.page, "CANCELLED");
    const trackUrl = await readTrackingUrl(front.page);

    await anon.goto(trackUrl);
    await waitForHydration(anon);
    await expectStatus(anon, "CANCELLED");

    const steps = anon.locator(".vstep li");
    await expect(steps).not.toHaveCount(0);
    for (const label of ["รับงาน", "กำลังตรวจสอบ", "รออนุมัติราคา", "ยกเลิก"]) {
      const step = steps.filter({ hasText: label });
      await expect(step, `history step ${label}`).toHaveCount(1);
      // Every step that really happened carries its date; the defect dropped those dates.
      await expect(step.locator(".xs.muted")).toHaveCount(1);
    }
    for (const label of ["กำลังซ่อม", "รอชำระ/รับเครื่อง", "เสร็จสิ้น"]) {
      await expect(
        steps.getByText(label, { exact: true }),
        `repair stage ${label} must not appear`,
      ).toHaveCount(0);
    }

    // No staff identities leak into the customer view.
    const html = await anon.content();
    for (const staff of ["สมศรี", "ช่างเอ", "ช่างบี"])
      expect(html).not.toContain(staff);
  } finally {
    await Promise.all([front.context.close(), anonContext.close()]);
  }
});
