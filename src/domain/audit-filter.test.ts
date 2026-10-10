import { describe, expect, it } from "vitest";
import type { AuditFilter } from "./audit-filter";
import {
  AUDIT_ACTIONS,
  buildAuditWhere,
  isAuditAction,
  parseAuditFilter,
  parseAuditJson,
  parseBangkokDate,
} from "./audit-filter";

const filter = (overrides: Partial<AuditFilter> = {}): AuditFilter => ({
  action: undefined,
  actor: "",
  jobNo: "",
  from: undefined,
  to: undefined,
  page: 1,
  ...overrides,
});

describe("parseBangkokDate", () => {
  it("turns a start day into 00:00 Bangkok (UTC+7)", () => {
    expect(parseBangkokDate("2026-10-10", false)?.toISOString()).toBe(
      "2026-10-09T17:00:00.000Z",
    );
  });

  it("turns an end day into 23:59:59.999 Bangkok so the whole day is included", () => {
    expect(parseBangkokDate("2026-10-10", true)?.toISOString()).toBe(
      "2026-10-10T16:59:59.999Z",
    );
  });

  it("rejects empty, malformed and impossible dates", () => {
    for (const value of [
      undefined,
      "",
      "10/10/2026",
      "2026-13-01",
      "2026-02-30",
      "2026-1-1",
    ]) {
      expect(parseBangkokDate(value, false)).toBeUndefined();
    }
  });
});

describe("parseAuditFilter", () => {
  it("keeps a valid action and drops an unknown one", () => {
    expect(parseAuditFilter({ action: "job.complete" }).action).toBe(
      "job.complete",
    );
    expect(parseAuditFilter({ action: "job.destroy" }).action).toBeUndefined();
  });

  it("trims text filters and defaults the page", () => {
    const parsed = parseAuditFilter({
      actor: "  แอดมิน  ",
      jobNo: " RJ-2026-0005 ",
      page: "abc",
    });
    expect(parsed.actor).toBe("แอดมิน");
    expect(parsed.jobNo).toBe("RJ-2026-0005");
    expect(parsed.page).toBe(1);
  });

  it("reads a date range with an inclusive end-of-day", () => {
    const parsed = parseAuditFilter({ from: "2026-10-09", to: "2026-10-10" });
    expect(parsed.from?.toISOString()).toBe("2026-10-08T17:00:00.000Z");
    expect(parsed.to?.toISOString()).toBe("2026-10-10T16:59:59.999Z");
  });

  it("accepts a page beyond one", () => {
    expect(parseAuditFilter({ page: "3" }).page).toBe(3);
    expect(parseAuditFilter({ page: "-2" }).page).toBe(1);
  });
});

describe("buildAuditWhere", () => {
  it("returns an empty where when nothing is filtered", () => {
    expect(buildAuditWhere(filter(), undefined)).toEqual({});
  });

  it("constrains by the exact resolved job id when a Job Number is given", () => {
    expect(buildAuditWhere(filter({ jobNo: "RJ-2026-0005" }), "job-5")).toEqual(
      { jobId: "job-5" },
    );
  });

  it("returns null for an unknown Job Number instead of matching the whole log", () => {
    expect(
      buildAuditWhere(filter({ jobNo: "RJ-9999-9999" }), undefined),
    ).toBeNull();
  });

  it("builds an inclusive at-range and label search", () => {
    const from = parseBangkokDate("2026-10-09", false)!;
    const to = parseBangkokDate("2026-10-10", true)!;
    expect(
      buildAuditWhere(filter({ actor: "ลูกค้า", from, to }), undefined),
    ).toEqual({
      actorLabel: { contains: "ลูกค้า" },
      at: { gte: from, lte: to },
    });
  });
});

describe("isAuditAction / AUDIT_ACTIONS", () => {
  it("accepts every action the app writes", () => {
    for (const action of AUDIT_ACTIONS)
      expect(isAuditAction(action)).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isAuditAction("nope")).toBe(false);
    expect(isAuditAction(undefined)).toBe(false);
  });
});

describe("parseAuditJson", () => {
  it("parses stored JSON, treats empty as null and survives corrupt data", () => {
    expect(parseAuditJson('{"status":"APPROVED"}')).toEqual({
      status: "APPROVED",
    });
    expect(parseAuditJson(null)).toBeNull();
    expect(parseAuditJson("{not json")).toBeNull();
  });
});
