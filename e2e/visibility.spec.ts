import { expect, test } from "@playwright/test";
import { e2eEnv } from "./env";
import {
  actor,
  createJob,
  expectStatus,
  readTrackingUrl,
  REAL_PNG,
  uploadAttachment,
  type Actor,
  type UploadFile,
} from "./helpers";

const INTAKE_PHOTO: UploadFile = {
  name: "intake-photo.png",
  mimeType: "image/png",
  buffer: REAL_PNG.buffer,
};
const BANK_SLIP: UploadFile = {
  name: "slip-bank.png",
  mimeType: "image/png",
  buffer: REAL_PNG.buffer,
};

/**
 * Visibility and privacy, asserted against the real HTTP surface:
 *  - a technician cannot open another technician's job (private 404),
 *  - uploads are unreadable without a session or the matching tracking token,
 *  - the tracking token never unlocks a payment slip,
 *  - the public tracking response leaks no staff names, audit rows or internal fields.
 */
test("สิทธิ์เข้าถึง: ช่างคนอื่น 404, ไฟล์/โทเคน, และความเป็นส่วนตัวหน้าลูกค้า", async ({
  browser,
}) => {
  const front: Actor = await actor(browser, "frontdesk");
  const tech2: Actor = await actor(browser, "tech2");
  const anonContext = await browser.newContext();
  const anon = anonContext.request;
  const baseUrl = e2eEnv().baseUrl;

  try {
    const { id, jobNo } = await createJob(front.page, {
      technicianLabel: "ช่างเอ",
      name: "ลูกค้าเอกชน",
    });
    await expectStatus(front.page, "RECEIVED");

    // Front desk uploads an intake photo and a transfer slip (staff may see both).
    expect((await uploadAttachment(front.page, INTAKE_PHOTO, "INTAKE")).status()).toBe(201);
    await expect(
      front.page.locator("figure.thumb", { hasText: INTAKE_PHOTO.name }),
    ).toBeVisible();
    expect((await uploadAttachment(front.page, BANK_SLIP, "PAYMENT_SLIP")).status()).toBe(201);
    await expect(
      front.page.locator("figure.thumb", { hasText: BANK_SLIP.name }),
    ).toBeVisible();

    const hrefFor = async (fileName: string) =>
      (await front.page
        .locator("figure.thumb", { hasText: fileName })
        .locator("a")
        .first()
        .getAttribute("href"))!;
    const intakeId = (await hrefFor(INTAKE_PHOTO.name)).split("/").pop()!;
    const slipId = (await hrefFor(BANK_SLIP.name)).split("/").pop()!;
    const token = (await readTrackingUrl(front.page)).split("/track/")[1];
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    // Another technician cannot even see the job.
    await tech2.page.goto(`/jobs/${id}`);
    await expect(tech2.page.getByText("ไม่พบข้อมูล")).toBeVisible();
    await tech2.page.goto("/jobs");
    await expect(tech2.page.getByText(jobNo)).toHaveCount(0);

    // Anonymous file access is always a 404, with or without a wrong token.
    const anonymousIntake = await anon.get(`${baseUrl}/files/${intakeId}`);
    expect(anonymousIntake.status()).toBe(404);
    const unknownId = await anon.get(`${baseUrl}/files/${"a".repeat(36)}?t=${token}`);
    expect(unknownId.status()).toBe(404);
    const wrongToken = await anon.get(`${baseUrl}/files/${intakeId}?t=${"z".repeat(32)}`);
    expect(wrongToken.status()).toBe(404);

    // The tracking token unlocks the intake photo...
    const tokenIntake = await anon.get(`${baseUrl}/files/${intakeId}?t=${token}`);
    expect(tokenIntake.status()).toBe(200);
    expect(tokenIntake.headers()["content-type"]).toContain("image/png");
    expect(tokenIntake.headers()["x-content-type-options"]).toBe("nosniff");

    // ...but never the payment slip, whose bank details stay staff-only.
    const tokenSlip = await anon.get(`${baseUrl}/files/${slipId}?t=${token}`);
    expect(tokenSlip.status()).toBe(404);

    // Unknown tracking links share the same private 404.
    const badLink = await anon.get(`${baseUrl}/track/${"x".repeat(32)}`);
    expect(badLink.status()).toBe(404);

    // Public tracking response: noindex, and none of the internal vocabulary.
    const trackResponse = await anon.get(`${baseUrl}/track/${token}`);
    expect(trackResponse.status()).toBe(200);
    const html = await trackResponse.text();
    expect(html).toContain("noindex");
    for (const leak of [
      "สมศรี", // front-desk staff name (job creator)
      "ช่างเอ", // assigned technician name
      "job.create",
      "auditLog",
      BANK_SLIP.name, // the slip is not even listed
    ])
      expect(html).not.toContain(leak);
  } finally {
    await Promise.all([front.context.close(), tech2.context.close(), anonContext.close()]);
  }
});
