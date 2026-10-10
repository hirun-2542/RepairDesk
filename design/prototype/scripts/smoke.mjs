// Drives the prototype through the full workflow in ONE page session (state lives in memory), asserting each gate.
// Waits are always on a concrete, state-specific element (status badge / toast / dialog), never on text that is always on screen.
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:5174";
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome` });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "th-TH" })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const go = (hash) => page.evaluate((h) => { location.hash = h; }, hash);
const see = (text) => page.getByText(text).first().waitFor({ timeout: 5000 });
const status = (label) => page.locator(".badge-lg", { hasText: label }).waitFor({ timeout: 5000 });
const step = (n) => console.log(`✓ ${n}`);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

await page.goto(`${BASE}/#/login?nodock=1`);
await page.getByRole("button", { name: "หน้าร้าน", exact: true }).click();
await page.waitForURL(/#\/jobs/);
await see("กระดานงาน");
step("demo login (front desk) → board");

// Front desk creates a job assigned to tech A
await go("/jobs/new?nodock=1");
await page.locator("#phone").fill("081-999-8888");
await page.locator("#name").fill("ทดสอบ ระบบ");
await page.locator("#brand").fill("Apple");
await page.locator("#model").fill("iPhone 13");
await page.locator("#symptom").fill("จอแตก");
await page.locator("#tech").selectOption({ label: "ช่างเอ" });
await page.getByRole("button", { name: "บันทึกใบรับงาน" }).click();
await see("RJ-2026-0013");
await status("รับงาน");
step("front desk creates RJ-2026-0013 (status RECEIVED)");

// Guards: front desk has no 'start diagnosis'; technician B cannot see the job
assert.equal(await page.getByRole("button", { name: "เริ่มตรวจสอบ" }).count(), 0);
await go("/jobs/j13?as=tech2&nodock=1");
await see("ไม่พบข้อมูล");
step("tech B gets Not Found on someone else's job; front desk has no 'start diagnosis'");

// Tech A: diagnose → quote
await go("/jobs/j13?as=tech1&nodock=1");
await page.getByRole("button", { name: "เริ่มตรวจสอบ" }).click();
await status("กำลังตรวจสอบ");
await page.getByRole("button", { name: "ส่งใบเสนอราคา" }).click();
await page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click(); // empty → validation, dialog stays open
await see("กรุณากรอกผลการตรวจสอบ");
await page.getByLabel("ผลการตรวจสอบ").fill("จอ LCD เสีย");
await page.getByLabel("รายการ", { exact: true }).fill("เปลี่ยนจอ");
await page.getByLabel("ราคาต่อหน่วย (บาท)").fill("1500");
await see("฿1,605.00"); // 1,500 + 7% VAT
await page.getByRole("button", { name: "ส่งใบเสนอราคาให้ลูกค้า" }).click();
await status("รออนุมัติราคา");
step("tech A starts diagnosis, validation blocks empty quote, submits quote: VAT 7% total ฿1,605.00");

const link = await page.getByTestId("tracking-link").innerText();
const token = link.split("/track/")[1];
assert.equal(token.length, 32);

// Customer approves via tracking link (no login)
await go(`/track/${token}?nodock=1`);
await see("กรุณาพิจารณาใบเสนอราคา");
await page.getByRole("button", { name: /อนุมัติ ฿1,605/ }).click();
await see("อนุมัติใบเสนอราคาแล้ว");
step("customer approves quote through /track/<32-char token>");

// Tech A repairs: MARK_READY disabled until an AFTER photo is uploaded
await go("/jobs/j13?as=tech1&nodock=1");
await status("อนุมัติแล้ว");
await page.getByRole("button", { name: "เริ่มซ่อม" }).click();
await status("กำลังซ่อม");
const ready = page.getByRole("button", { name: "ซ่อมเสร็จ พร้อมรับเครื่อง" });
assert.equal(await ready.isDisabled(), true);
await see("ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป");
await page.getByTestId("file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
await see("ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF");
assert.equal(await ready.isDisabled(), true); // rejected file must not unlock the guard
await page.locator("#stage").selectOption("AFTER");
await page.getByTestId("file-input").setInputFiles({ name: "after.png", mimeType: "image/png", buffer: PNG });
await see("แนบไฟล์เรียบร้อย");
assert.equal(await ready.isDisabled(), false);
await ready.click();
await status("รอชำระ/รับเครื่อง");
step("guard: mark-ready disabled with reason; .txt rejected (guard stays locked); after.png accepted; mark-ready then works");

// Front desk completes: transfer needs a slip; cash completes
await go("/jobs/j13?as=front&nodock=1");
await page.getByRole("button", { name: "รับชำระเงินและปิดงาน" }).click();
await page.getByRole("button", { name: "โอนเงิน" }).click();
await see("ต้องแนบสลิปการโอนก่อน");
assert.equal(await page.getByRole("button", { name: /ยืนยันรับชำระ/ }).isDisabled(), true);
await page.getByRole("button", { name: "เงินสด" }).click();
await page.getByRole("button", { name: /ยืนยันรับชำระ ฿1,605\.00/ }).click();
await status("เสร็จสิ้น");
await see("งานนี้ปิดแล้ว ไม่มีรายการที่ต้องดำเนินการ");
assert.equal(await page.getByRole("button", { name: /ยกเลิกงาน/ }).count(), 0);
step("front desk: transfer blocked without slip; cash completes at ฿1,605.00; no actions remain");

// Admin audit log shows the full chain
await go("/admin/audit?as=admin&nodock=1");
await page.getByLabel("เลขที่งาน").fill("RJ-2026-0013");
await page.locator("tbody").getByText("job.complete").first().waitFor({ timeout: 5000 });
const body = await page.locator("tbody").innerText(); // table only: the filter <select> lists every action and would make this vacuous
for (const a of ["job.create", "job.start_diagnosis", "job.submit_quote", "job.approve_quote", "job.start_repair", "attachment.upload", "job.mark_ready", "job.complete"]) assert.ok(body.includes(a), `audit missing ${a}`);
assert.match(body, /ลูกค้า \(ลิงก์ติดตามงาน\)/);
step("admin audit lists job.create … job.complete incl. customer actor");

assert.deepEqual(errors, []);
console.log("ALL SMOKE CHECKS PASSED");
await browser.close();
