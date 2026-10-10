import { describe, expect, it } from "vitest";
import type { Actor, JobAction, JobStatus } from "./types";
import {
  availableActions,
  checkAction,
  type WorkflowContext,
} from "./workflow";

const admin: Actor = {
  kind: "USER",
  id: "u-admin",
  role: "ADMIN",
  name: "แอดมิน",
};
const front: Actor = {
  kind: "USER",
  id: "u-front",
  role: "FRONT_DESK",
  name: "สมศรี",
};
const tech1: Actor = {
  kind: "USER",
  id: "t1",
  role: "TECHNICIAN",
  name: "ช่างเอ",
};
const tech2: Actor = {
  kind: "USER",
  id: "t2",
  role: "TECHNICIAN",
  name: "ช่างบี",
};
const customer: Actor = { kind: "CUSTOMER" };

const WRONG_STATUS = "ไม่สามารถทำรายการนี้ในสถานะปัจจุบัน";
const NO_RIGHT = "ไม่มีสิทธิ์ทำรายการนี้";
const NO_TECH = "ยังไม่ได้มอบหมายช่าง";
const NOT_REJECTED = "ลูกค้ายังไม่ได้ปฏิเสธใบเสนอราคา";
const NO_AFTER_PHOTO = "ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป";

const ctx = (over: Partial<WorkflowContext> = {}): WorkflowContext => ({
  status: "RECEIVED",
  technicianId: "t1",
  latestQuoteStatus: null,
  afterPhotoCount: 0,
  ...over,
});

describe("checkAction — allowed transitions (rules table)", () => {
  const allowed: [JobAction, Actor, WorkflowContext, JobStatus][] = [
    ["START_DIAGNOSIS", tech1, ctx({ status: "RECEIVED" }), "DIAGNOSING"],
    ["SUBMIT_QUOTE", tech1, ctx({ status: "DIAGNOSING" }), "QUOTED"],
    [
      "APPROVE_QUOTE",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      "APPROVED",
    ],
    [
      "APPROVE_QUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      "APPROVED",
    ],
    [
      "REJECT_QUOTE",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      "QUOTED",
    ],
    [
      "REJECT_QUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      "QUOTED",
    ],
    [
      "REQUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      "DIAGNOSING",
    ],
    ["START_REPAIR", tech1, ctx({ status: "APPROVED" }), "REPAIRING"],
    [
      "MARK_READY",
      tech1,
      ctx({ status: "REPAIRING", afterPhotoCount: 1 }),
      "READY_FOR_PICKUP",
    ],
    ["COMPLETE", front, ctx({ status: "READY_FOR_PICKUP" }), "COMPLETED"],
    ["CANCEL", front, ctx({ status: "RECEIVED" }), "CANCELLED"],
    ["CANCEL", front, ctx({ status: "DIAGNOSING" }), "CANCELLED"],
    ["CANCEL", front, ctx({ status: "QUOTED" }), "CANCELLED"],
    // Admin passes every role check.
    ["START_DIAGNOSIS", admin, ctx({ status: "RECEIVED" }), "DIAGNOSING"],
    ["SUBMIT_QUOTE", admin, ctx({ status: "DIAGNOSING" }), "QUOTED"],
    [
      "APPROVE_QUOTE",
      admin,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      "APPROVED",
    ],
    [
      "REQUOTE",
      admin,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      "DIAGNOSING",
    ],
    ["START_REPAIR", admin, ctx({ status: "APPROVED" }), "REPAIRING"],
    [
      "MARK_READY",
      admin,
      ctx({ status: "REPAIRING", afterPhotoCount: 1 }),
      "READY_FOR_PICKUP",
    ],
    ["COMPLETE", admin, ctx({ status: "READY_FOR_PICKUP" }), "COMPLETED"],
    ["CANCEL", admin, ctx({ status: "RECEIVED" }), "CANCELLED"],
  ];
  it.each(allowed)("%s by %o → %s", (action, actor, context, to) => {
    expect(checkAction(action, actor, context)).toEqual({ ok: true, to });
  });
});

describe("checkAction — denied transitions and Thai reasons", () => {
  const denied: [JobAction, Actor, WorkflowContext, string][] = [
    // Wrong actor.
    ["START_DIAGNOSIS", front, ctx({ status: "RECEIVED" }), NO_RIGHT],
    ["START_DIAGNOSIS", customer, ctx({ status: "RECEIVED" }), NO_RIGHT],
    ["START_DIAGNOSIS", tech2, ctx({ status: "RECEIVED" }), NO_RIGHT],
    [
      "START_DIAGNOSIS",
      tech1,
      ctx({ status: "RECEIVED", technicianId: null }),
      NO_RIGHT,
    ],
    ["SUBMIT_QUOTE", front, ctx({ status: "DIAGNOSING" }), NO_RIGHT],
    [
      "APPROVE_QUOTE",
      tech1,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      NO_RIGHT,
    ],
    [
      "REJECT_QUOTE",
      tech1,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      NO_RIGHT,
    ],
    [
      "REQUOTE",
      tech1,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      NO_RIGHT,
    ],
    [
      "REQUOTE",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      NO_RIGHT,
    ],
    ["START_REPAIR", front, ctx({ status: "APPROVED" }), NO_RIGHT],
    ["START_REPAIR", tech2, ctx({ status: "APPROVED" }), NO_RIGHT],
    [
      "MARK_READY",
      front,
      ctx({ status: "REPAIRING", afterPhotoCount: 1 }),
      NO_RIGHT,
    ],
    ["COMPLETE", tech1, ctx({ status: "READY_FOR_PICKUP" }), NO_RIGHT],
    ["CANCEL", tech1, ctx({ status: "RECEIVED" }), NO_RIGHT],
    ["CANCEL", customer, ctx({ status: "RECEIVED" }), NO_RIGHT],
    // Wrong status.
    ["START_DIAGNOSIS", tech1, ctx({ status: "QUOTED" }), WRONG_STATUS],
    ["SUBMIT_QUOTE", tech1, ctx({ status: "RECEIVED" }), WRONG_STATUS],
    ["START_REPAIR", tech1, ctx({ status: "RECEIVED" }), WRONG_STATUS],
    [
      "MARK_READY",
      tech1,
      ctx({ status: "APPROVED", afterPhotoCount: 1 }),
      WRONG_STATUS,
    ],
    ["COMPLETE", front, ctx({ status: "REPAIRING" }), WRONG_STATUS],
    ["CANCEL", front, ctx({ status: "APPROVED" }), WRONG_STATUS],
    ["CANCEL", front, ctx({ status: "READY_FOR_PICKUP" }), WRONG_STATUS],
    ["START_DIAGNOSIS", admin, ctx({ status: "COMPLETED" }), WRONG_STATUS],
    ["CANCEL", admin, ctx({ status: "CANCELLED" }), WRONG_STATUS],
    [
      "APPROVE_QUOTE",
      customer,
      ctx({ status: "COMPLETED", latestQuoteStatus: "PENDING" }),
      WRONG_STATUS,
    ],
    // Guards.
    [
      "START_DIAGNOSIS",
      admin,
      ctx({ status: "RECEIVED", technicianId: null }),
      NO_TECH,
    ],
    [
      "APPROVE_QUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: null }),
      WRONG_STATUS,
    ],
    [
      "APPROVE_QUOTE",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      WRONG_STATUS,
    ],
    [
      "REJECT_QUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: null }),
      WRONG_STATUS,
    ],
    [
      "REQUOTE",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      NOT_REJECTED,
    ],
    [
      "REQUOTE",
      admin,
      ctx({ status: "QUOTED", latestQuoteStatus: null }),
      NOT_REJECTED,
    ],
    [
      "MARK_READY",
      tech1,
      ctx({ status: "REPAIRING", afterPhotoCount: 0 }),
      NO_AFTER_PHOTO,
    ],
    [
      "MARK_READY",
      admin,
      ctx({ status: "REPAIRING", afterPhotoCount: 0 }),
      NO_AFTER_PHOTO,
    ],
  ];
  it.each(denied)("%s by %o (%#)", (action, actor, context, reason) => {
    expect(checkAction(action, actor, context)).toEqual({ ok: false, reason });
  });
});

describe("availableActions", () => {
  const cases: [string, Actor, WorkflowContext, JobAction[]][] = [
    [
      "assigned tech sees start diagnosis",
      tech1,
      ctx({ status: "RECEIVED" }),
      ["START_DIAGNOSIS"],
    ],
    ["unassigned tech sees nothing", tech2, ctx({ status: "RECEIVED" }), []],
    [
      "front desk receives + cancels",
      front,
      ctx({ status: "RECEIVED" }),
      ["CANCEL"],
    ],
    ["customer has no action", customer, ctx({ status: "RECEIVED" }), []],
    [
      "admin in RECEIVED keeps guard-failed start diagnosis visible",
      admin,
      ctx({ status: "RECEIVED", technicianId: null }),
      ["START_DIAGNOSIS", "CANCEL"],
    ],
    [
      "assigned tech submits quote",
      tech1,
      ctx({ status: "DIAGNOSING" }),
      ["SUBMIT_QUOTE"],
    ],
    [
      "front cancels while diagnosing",
      front,
      ctx({ status: "DIAGNOSING" }),
      ["CANCEL"],
    ],
    [
      "pending quote exposes approve + reject",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      ["APPROVE_QUOTE", "REJECT_QUOTE", "CANCEL"],
    ],
    [
      "pending quote hides requote",
      admin,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      ["APPROVE_QUOTE", "REJECT_QUOTE", "CANCEL"],
    ],
    [
      "rejected quote exposes requote",
      front,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      ["APPROVE_QUOTE", "REJECT_QUOTE", "REQUOTE", "CANCEL"],
    ],
    [
      "customer decides pending quote",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "PENDING" }),
      ["APPROVE_QUOTE", "REJECT_QUOTE"],
    ],
    [
      "customer cannot requote",
      customer,
      ctx({ status: "QUOTED", latestQuoteStatus: "REJECTED" }),
      ["APPROVE_QUOTE", "REJECT_QUOTE"],
    ],
    [
      "assigned tech starts repair",
      tech1,
      ctx({ status: "APPROVED" }),
      ["START_REPAIR"],
    ],
    ["front has nothing in APPROVED", front, ctx({ status: "APPROVED" }), []],
    [
      "mark ready stays visible without after photo (guard shown as disabled)",
      tech1,
      ctx({ status: "REPAIRING", afterPhotoCount: 0 }),
      ["MARK_READY"],
    ],
    [
      "front completes",
      front,
      ctx({ status: "READY_FOR_PICKUP" }),
      ["COMPLETE"],
    ],
    [
      "assigned tech has no action when ready",
      tech1,
      ctx({ status: "READY_FOR_PICKUP" }),
      [],
    ],
    ["terminal COMPLETED", admin, ctx({ status: "COMPLETED" }), []],
    ["terminal CANCELLED", admin, ctx({ status: "CANCELLED" }), []],
  ];
  it.each(cases)("%s", (_name, actor, context, expected) => {
    expect(availableActions(actor, context)).toEqual(expected);
  });

  it("every visible action is allowed or fails only on a guard, never on role", () => {
    const statuses: JobStatus[] = [
      "RECEIVED",
      "DIAGNOSING",
      "QUOTED",
      "APPROVED",
      "REPAIRING",
      "READY_FOR_PICKUP",
      "COMPLETED",
      "CANCELLED",
    ];
    const quoteStatuses = [null, "PENDING", "APPROVED", "REJECTED"] as const;
    for (const actor of [admin, front, tech1, tech2, customer]) {
      for (const status of statuses) {
        for (const latestQuoteStatus of quoteStatuses) {
          const context = ctx({
            status,
            latestQuoteStatus,
            technicianId: "t1",
          });
          for (const action of availableActions(actor, context)) {
            const result = checkAction(action, actor, context);
            if (!result.ok) expect(result.reason).not.toBe(NO_RIGHT);
          }
        }
      }
    }
  });
});
