import { expect, test } from "@playwright/test";
import {
  actor,
  createJob,
  expectStatus,
  openJob,
  readTrackingUrl,
  REAL_PNG,
  uploadAttachment,
  waitForHydration,
  type Actor,
} from "./helpers";

/**
 * Seam 2 of the spec — one browser journey over the whole workflow on the isolated,
 * freshly seeded host: intake → diagnosis → quote → customer approval → repair →
 * after photo → ready → cash payment → receipt → audit trail.
 * The negative checks the ticket asks for live in the same run so their state is real.
 */
test("happy path: รับงานมือถือ → อนุมัติ → ซ่อม → ชำระเงินสด → เสร็จสิ้น", async ({
  browser,
}) => {
  const front: Actor = await actor(browser, "frontdesk");
  const tech: Actor = await actor(browser, "tech1");
  const admin: Actor = await actor(browser, "admin");
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();

  try {
    // 1. Front desk intake, assigned to Technician A.
    const { id, jobNo } = await createJob(front.page, {
      technicianLabel: "ช่างเอ",
      brand: "Apple",
      model: "iPhone 15",
      symptom: "หน้าจอแตก ทัชไม่ติด",
    });
    await expectStatus(front.page, "RECEIVED");
    await expect(front.page.getByText(jobNo, { exact: true }).first()).toBeVisible();

    // 2. Technician starts the diagnosis.
    await openJob(tech.page, id);
    await expectStatus(tech.page, "RECEIVED");
    await tech.page.getByRole("button", { name: "เริ่มตรวจสอบ" }).click();
    await expectStatus(tech.page, "DIAGNOSING");

    // 3. Quote dialog: empty diagnosis is rejected before anything is sent.
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click();
    await expect(tech.page.getByText("กรุณากรอกผลการตรวจสอบ")).toBeVisible();

    //    Fill the labor line 1 × 1,500 baht and check the live VAT computation.
    await tech.page.fill("#diagnosis", "จอแสดงผลเสีย ต้องเปลี่ยนทั้งชุด");
    await tech.page.fill("#description0", "เปลี่ยนจอ iPhone 15");
    await tech.page.fill("#price0", "1500");
    const quoteTotals = tech.page.locator(".totals");
    await expect(quoteTotals).toContainText("฿1,500.00");
    await expect(quoteTotals).toContainText("฿105.00");
    await expect(quoteTotals.locator(".grand")).toContainText("฿1,605.00");
    await tech.page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click();
    await expectStatus(tech.page, "QUOTED");

    // 4. The customer opens the tracking link in a separate browser context and approves.
    const trackUrl = await readTrackingUrl(tech.page);
    await customer.goto(trackUrl);
    await waitForHydration(customer);
    await expectStatus(customer, "QUOTED");
    await expect(customer.getByText("฿1,605.00").first()).toBeVisible();
    await customer.getByRole("button", { name: /อนุมัติ/ }).click();
    await expect(customer.getByText("อนุมัติใบเสนอราคาแล้ว")).toBeVisible();
    await expectStatus(customer, "APPROVED");
    await expect(customer.getByRole("button", { name: /อนุมัติ/ })).toHaveCount(0);

    // 5. Technician repairs, then meets the After-photo guard.
    await openJob(tech.page, id);
    await expectStatus(tech.page, "APPROVED");
    await tech.page.getByRole("button", { name: "เริ่มซ่อม" }).click();
    await expectStatus(tech.page, "REPAIRING");

    const markReady = tech.page.getByRole("button", {
      name: "ซ่อมเสร็จ พร้อมรับเครื่อง",
    });
    await expect(markReady).toBeVisible();
    await expect(markReady).toBeDisabled();
    await expect(
      tech.page.getByText("ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป"),
    ).toBeVisible();

    // 6. File-upload guards: a text file and a fake PNG are rejected by the real API.
    const textUpload = await uploadAttachment(tech.page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    expect(textUpload.status()).toBe(400);
    await expect(
      tech.page.getByText("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF").first(),
    ).toBeVisible();

    const fakePng = await uploadAttachment(tech.page, {
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("this is not a png at all"),
    });
    expect(fakePng.status()).toBe(400);
    await expect(
      tech.page.getByText("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF").first(),
    ).toBeVisible();

    // 7. A real PNG at the AFTER stage unlocks Mark Ready.
    const afterUpload = await uploadAttachment(tech.page, REAL_PNG, "AFTER");
    expect(afterUpload.status()).toBe(201);
    await expect(tech.page.getByText("แนบไฟล์เรียบร้อย")).toBeVisible();
    await expect(
      tech.page.locator("figure.thumb", { hasText: REAL_PNG.name }),
    ).toBeVisible();
    await expect(markReady).toBeEnabled();
    await markReady.click();
    await expectStatus(tech.page, "READY_FOR_PICKUP");

    // 8. Front desk: transfer without a slip is blocked; cash completes for the approved total.
    await openJob(front.page, id);
    await expectStatus(front.page, "READY_FOR_PICKUP");
    await front.page.getByRole("button", { name: "รับชำระเงินและปิดงาน" }).click();
    await expect(front.page.locator(".card", { hasText: "ยอดที่ต้องชำระ" })).toContainText(
      "฿1,605.00",
    );
    const confirmPayment = front.page.getByRole("button", {
      name: /ยืนยันรับชำระ/,
    });
    await front.page.selectOption("#method", "TRANSFER");
    await expect(front.page.getByText("ต้องแนบสลิปการโอนก่อน")).toBeVisible();
    await expect(confirmPayment).toBeDisabled();
    await front.page.selectOption("#method", "CASH");
    await expect(confirmPayment).toBeEnabled();
    await confirmPayment.click();
    await expect(front.page.getByText("รับชำระเงินและปิดงานเรียบร้อย")).toBeVisible();
    await expectStatus(front.page, "COMPLETED");

    // 9. Printable receipt shows the paid amount.
    await front.page.goto(`/jobs/${id}/receipt`);
    await expect(
      front.page.getByRole("heading", { name: "ใบเสร็จรับเงิน", exact: true }),
    ).toBeVisible();
    await expect(front.page.locator(".totals .grand")).toContainText("฿1,605.00");
    await expect(front.page.locator(".totals")).toContainText("฿105.00");

    // 10. Admin audit, filtered by Job Number, lists every step from job.create to job.complete.
    await admin.page.goto(`/admin/audit?jobNo=${encodeURIComponent(jobNo)}`);
    const rows = admin.page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const actions = (await admin.page.locator("tbody .mono.xs").allInnerTexts())
      .map((text) => text.trim())
      .sort();
    expect(actions).toEqual(
      [
        "job.create",
        "job.start_diagnosis",
        "job.submit_quote",
        "job.approve_quote",
        "job.start_repair",
        "attachment.upload",
        "job.mark_ready",
        "job.complete",
      ].sort(),
    );
    await expect(rows).toHaveCount(8);
    for (const row of await rows.all()) {
      await expect(row).toContainText(jobNo);
    }
  } finally {
    await Promise.all([
      front.context.close(),
      tech.context.close(),
      admin.context.close(),
      customerContext.close(),
    ]);
  }
});
