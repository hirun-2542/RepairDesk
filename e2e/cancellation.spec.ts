import { expect, test } from "@playwright/test";
import { actor, createJob, expectJobDetail, expectStatus, readTrackingUrl, type Actor } from "./helpers";

const CLOSED_NOTICE =
  "งานนี้ปิดแล้ว ไม่มีรายการที่ต้องดำเนินการ และไม่สามารถแนบไฟล์เพิ่ม";

/**
 * Cancellation rules: a reason is mandatory, a positive inspection fee needs a payment
 * method and is recorded, a zero fee records no payment, and closed jobs expose no actions.
 */
test("ยกเลิกงานพร้อมค่าตรวจเช็ค 300 และยกเลิกแบบไม่คิดเงิน", async ({ browser }) => {
  const front: Actor = await actor(browser, "frontdesk");
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();

  try {
    // --- Job A: cancel with a 300 baht inspection fee.
    await createJob(front.page);
    await expectStatus(front.page, "RECEIVED");
    await front.page.getByRole("button", { name: "ยกเลิกงาน" }).click();
    await front.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expect(front.page.getByText("กรุณาระบุเหตุผลการยกเลิก")).toBeVisible();

    await front.page.fill("#cancel-reason", "ลูกค้าเปลี่ยนใจ ไม่ซ่อมแล้ว");
    await front.page.fill("#inspection-fee", "300");
    await front.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expect(
      front.page.getByText("กรุณาเลือกวิธีรับชำระค่าตรวจเช็ค"),
    ).toBeVisible();

    await front.page.selectOption("#fee-method", "CASH");
    await front.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expect(front.page.getByText("ยกเลิกงานเรียบร้อย")).toBeVisible();
    await expectStatus(front.page, "CANCELLED");
    await expect(front.page.locator("p.banner-error")).toContainText(
      "ลูกค้าเปลี่ยนใจ ไม่ซ่อมแล้ว",
    );
    const paymentCard = front.page.locator(".card", { hasText: "การชำระเงิน" });
    await expect(paymentCard).toContainText("ค่าตรวจเช็ค");
    await expect(paymentCard).toContainText("฿300.00");

    // A cancelled job is terminal: no actions, no uploads.
    await expect(front.page.getByText(CLOSED_NOTICE)).toBeVisible();
    await expect(front.page.locator('[data-testid="file-input"]')).toHaveCount(0);
    await expect(front.page.getByRole("button", { name: "ยกเลิกงาน" })).toHaveCount(0);

    // The customer sees the cancellation and the fee they were charged.
    const cancelledLink = await readTrackingUrl(front.page);
    await customer.goto(cancelledLink);
    await expectStatus(customer, "CANCELLED");
    await expect(customer.getByText("ลูกค้าเปลี่ยนใจ ไม่ซ่อมแล้ว")).toBeVisible();
    await expect(customer.getByText("฿300.00")).toBeVisible();

    // --- Job B: cancel without a fee records no payment at all.
    await createJob(front.page);
    await front.page.getByRole("button", { name: "ยกเลิกงาน" }).click();
    await front.page.fill("#cancel-reason", "ลูกค้ายกเลิกงานเอง");
    await front.page.getByRole("button", { name: "ยืนยันยกเลิกงาน" }).click();
    await expectStatus(front.page, "CANCELLED");
    await expect(
      front.page.locator(".card", { hasText: "การชำระเงิน" }),
    ).toHaveCount(0);
    const noFeeLink = await readTrackingUrl(front.page);
    await customer.goto(noFeeLink);
    await expectStatus(customer, "CANCELLED");
    await expect(customer.getByText("การชำระเงิน")).toHaveCount(0);
  } finally {
    await Promise.all([front.context.close(), customerContext.close()]);
  }
});

test("งานที่เริ่มซ่อมแล้วหรือปิดแล้วไม่มีปุ่มยกเลิก/แนบไฟล์", async ({ browser }) => {
  const front: Actor = await actor(browser, "frontdesk");
  try {
    // Repair has started: the job left the cancellable statuses.
    await front.page.goto("/jobs/list?status=REPAIRING");
    await front.page.locator("tbody tr a.mono").first().click();
    await expectJobDetail(front.page);
    await expectStatus(front.page, "REPAIRING");
    await expect(front.page.getByRole("button", { name: "ยกเลิกงาน" })).toHaveCount(0);
    await expect(
      front.page.getByRole("button", { name: "รับชำระเงินและปิดงาน" }),
    ).toHaveCount(0);

    // A completed job is closed for every action and upload.
    await front.page.goto("/jobs/list?status=COMPLETED");
    await front.page.locator("tbody tr a.mono").first().click();
    await expectJobDetail(front.page);
    await expectStatus(front.page, "COMPLETED");
    await expect(front.page.getByText(CLOSED_NOTICE)).toBeVisible();
    await expect(front.page.getByRole("button", { name: "ยกเลิกงาน" })).toHaveCount(0);
    await expect(front.page.locator('[data-testid="file-input"]')).toHaveCount(0);
  } finally {
    await front.context.close();
  }
});
