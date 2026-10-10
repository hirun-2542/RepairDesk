import { expect, test } from "@playwright/test";
import {
  actor,
  createJob,
  expectStatus,
  openJob,
  readTrackingUrl,
  waitForHydration,
  type Actor,
} from "./helpers";

/**
 * On-behalf rejection and re-quoting: front desk records the customer's refusal, re-opens
 * the diagnosis, the technician issues version 2, and the customer approves v2 through the
 * tracking link. Also proves the audit marks the on-behalf decision and the rejection trail.
 */
test("หน้าร้านปฏิเสธแทนลูกค้า → เสนอราคาใหม่ v2 → ลูกค้าอนุมัติ", async ({
  browser,
}) => {
  const front: Actor = await actor(browser, "frontdesk");
  const tech: Actor = await actor(browser, "tech1");
  const admin: Actor = await actor(browser, "admin");
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();

  try {
    const { id, jobNo } = await createJob(front.page, {
      technicianLabel: "ช่างเอ",
    });

    // Technician A quotes v1 for 1,000 baht.
    await openJob(tech.page, id);
    await tech.page.getByRole("button", { name: "เริ่มตรวจสอบ" }).click();
    await expectStatus(tech.page, "DIAGNOSING");
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
    await tech.page.fill("#diagnosis", "จอเสีย ต้องเปลี่ยนจอ");
    await tech.page.fill("#description0", "เปลี่ยนจอ");
    await tech.page.fill("#price0", "1000");
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click();
    await expectStatus(tech.page, "QUOTED");

    // Front desk records the refusal on the customer's behalf.
    await openJob(front.page, id);
    await expectStatus(front.page, "QUOTED");
    await front.page
      .getByRole("button", { name: "บันทึกลูกค้าปฏิเสธ (แทนลูกค้า)" })
      .click();
    await front.page.getByRole("button", { name: "ยืนยันปฏิเสธ" }).click();
    await expect(
      front.page.getByText("ลูกค้าปฏิเสธใบเสนอราคา — เลือกเสนอราคาใหม่ หรือยกเลิกงาน"),
    ).toBeVisible();
    await expectStatus(front.page, "QUOTED");
    const v1 = front.page.locator(".quote", { hasText: "ใบเสนอราคา v1" });
    await expect(v1.locator(".badge")).toHaveText("ลูกค้าปฏิเสธ");

    // Re-quote sends the job back to diagnosis.
    await front.page.getByRole("button", { name: "เสนอราคาใหม่" }).click();
    await expectStatus(front.page, "DIAGNOSING");

    // Technician A quotes v2 for 1,200 baht.
    await openJob(tech.page, id);
    await expectStatus(tech.page, "DIAGNOSING");
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
    await tech.page.fill("#diagnosis", "ยืนยันเปลี่ยนจอ พร้อมอะไหล่แท้");
    await tech.page.fill("#description0", "เปลี่ยนจอ แก้ราคาใหม่");
    await tech.page.fill("#price0", "1200");
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click();
    await expectStatus(tech.page, "QUOTED");

    const v2 = tech.page.locator(".quote", { hasText: "ใบเสนอราคา v2" });
    await expect(v2.locator(".badge")).toHaveText("รออนุมัติ");
    const v1Row = tech.page.locator(".quote", { hasText: "ใบเสนอราคา v1" });
    await expect(v1Row.locator(".badge")).toHaveText("ลูกค้าปฏิเสธ");

    // The customer approves version 2 through the tracking link.
    const trackUrl = await readTrackingUrl(tech.page);
    await customer.goto(trackUrl);
    await waitForHydration(customer);
    await expect(customer.getByText("ใบเสนอราคา v2")).toBeVisible();
    await customer.getByRole("button", { name: /อนุมัติ/ }).click();
    await expectStatus(customer, "APPROVED");

    // Audit trail: the on-behalf rejection is tagged, the customer's approval is not.
    await admin.page.goto(`/admin/audit?jobNo=${encodeURIComponent(jobNo)}`);
    const rejectRow = admin.page
      .locator("tbody tr")
      .filter({ hasText: "job.reject_quote" });
    await expect(rejectRow).toHaveCount(1);
    await expect(rejectRow.getByText("แทนลูกค้า")).toBeVisible();
    const requoteRow = admin.page
      .locator("tbody tr")
      .filter({ hasText: "job.requote" });
    await expect(requoteRow).toHaveCount(1);
    const approveRow = admin.page
      .locator("tbody tr")
      .filter({ hasText: "job.approve_quote" });
    await expect(approveRow).toHaveCount(1);
    // The customer's own approval carries no on-behalf marker (staff rows do).
    await expect(approveRow.getByText("แทนลูกค้า")).toHaveCount(0);
  } finally {
    await Promise.all([
      front.context.close(),
      tech.context.close(),
      admin.context.close(),
      customerContext.close(),
    ]);
  }
});
