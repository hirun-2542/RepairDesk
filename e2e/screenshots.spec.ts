import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { actor, readTrackingUrl } from "./helpers";

const WIDTHS = [1440, 390] as const;
const OUTPUT = "test-results/screens";

// 9 routes × 2 viewports, each compiled on demand by the dev server.
test.setTimeout(300_000);

type Route = { name: string; path: string; page: Page };

async function capture(page: Page, url: string, name: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await expect(page.locator("body")).toBeVisible();
  // No horizontal overflow at either width (design DoD).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${name} @${width}px horizontal overflow`).toBeLessThanOrEqual(2);
  mkdirSync(OUTPUT, { recursive: true });
  await page.screenshot({
    path: join(OUTPUT, `${width}-${name}.png`),
    fullPage: true,
  });
}

/**
 * Visual proof for every route at desktop (1440px) and mobile (390px). The screenshots are
 * test artifacts under test-results/, not tracked sources.
 */
test("screenshots ของทุกหน้า 1440px และ 390px", async ({ browser }) => {
  const front = await actor(browser, "frontdesk");
  const admin = await actor(browser, "admin");
  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();

  try {
    await front.page.goto("/jobs/list");
    const firstJobHref = await front.page
      .locator("tbody tr a.mono")
      .first()
      .getAttribute("href");
    const jobId = firstJobHref!.split("/").pop()!;
    await front.page.goto(`/jobs/${jobId}`);
    const trackUrl = await readTrackingUrl(front.page);

    const routes: Route[] = [
      { name: "login", path: "/login", page: anon },
      { name: "tracking", path: new URL(trackUrl).pathname, page: anon },
      { name: "board", path: "/jobs", page: front.page },
      { name: "job-list", path: "/jobs/list", page: front.page },
      { name: "job-new", path: "/jobs/new", page: front.page },
      { name: "job-detail", path: `/jobs/${jobId}`, page: front.page },
      { name: "receipt", path: `/jobs/${jobId}/receipt`, page: front.page },
      { name: "admin-users", path: "/admin/users", page: admin.page },
      { name: "admin-audit", path: "/admin/audit", page: admin.page },
    ];

    for (const width of WIDTHS)
      for (const route of routes) {
        await route.page.setViewportSize({ width, height: 900 });
        await capture(route.page, route.path, route.name, width);
      }
  } finally {
    await Promise.all([front.context.close(), admin.context.close(), anonContext.close()]);
  }
});
