import { expect, test } from "@playwright/test";
import { actor, loginWithCredentials, userRow, waitForHydration } from "./helpers";

/**
 * Admin user management through the real page: an admin cannot edit their own account,
 * a duplicate email is rejected, and deactivating a user invalidates that user's existing
 * session on its very next request (fresh authority from the database, not the JWT).
 */
test("จัดการผู้ใช้: ห้ามแก้บัญชีตัวเอง อีเมลซ้ำ และปิดใช้งานมีผลทันที", async ({
  browser,
}) => {
  const admin = await actor(browser, "admin");
  const newUserContext = await browser.newContext();
  const newUser = await newUserContext.newPage();
  const email = `e2e-${Date.now()}@demo.local`;

  try {
    await admin.page.goto("/admin/users");
    await waitForHydration(admin.page);
    await expect(admin.page.getByRole("heading", { name: "จัดการผู้ใช้" })).toBeVisible();

    // Own row: both controls are disabled.
    const myRow = userRow(admin.page, "admin@demo.local");
    await expect(myRow.getByText("คุณ")).toBeVisible();
    await expect(myRow.locator("select")).toBeDisabled();
    await expect(myRow.getByRole("switch")).toBeDisabled();

    // Duplicate email is rejected and mapped to the email field.
    await admin.page.fill("#new-name", "ผู้ใช้ซ้ำ");
    await admin.page.fill("#new-email", "frontdesk@demo.local");
    await admin.page.fill("#new-password", "demo1234");
    await admin.page.getByRole("button", { name: "สร้างผู้ใช้" }).click();
    await expect(admin.page.getByText("อีเมลนี้ถูกใช้แล้ว").first()).toBeVisible();

    // Create a real account, then sign in as it in a separate context.
    await admin.page.fill("#new-name", "ช่างทดสอบ");
    await admin.page.fill("#new-email", email);
    await admin.page.getByRole("button", { name: "สร้างผู้ใช้" }).click();
    await expect(admin.page.getByText("สร้างผู้ใช้เรียบร้อย")).toBeVisible();
    const createdRow = userRow(admin.page, email);
    await expect(createdRow).toBeVisible();

    await loginWithCredentials(newUser, email, "demo1234");
    await expect(newUser.locator(".side-user")).toContainText("ช่างทดสอบ");
    // Sanity: the fresh account really is active before the admin acts.
    await expect(newUser).toHaveURL(/\/jobs$/);

    // Deactivate it; the existing session must be refused on the next request.
    await createdRow.getByRole("switch").click();
    await expect(admin.page.getByText("ปิดใช้งานผู้ใช้แล้ว")).toBeVisible();
    await expect(createdRow.getByText("ปิดใช้งาน")).toBeVisible();

    await newUser.goto("/jobs");
    await expect(newUser).toHaveURL(/\/login\?inactive=1/);
    await expect(
      newUser.getByText("บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ"),
    ).toBeVisible();
  } finally {
    await Promise.all([admin.context.close(), newUserContext.close()]);
  }
});
