import { describe, expect, it } from "vitest";
import {
  ACTION_LABEL,
  AUDIT_LABEL,
  CATEGORY_LABEL,
  IDENTIFIER_LABEL,
  MAIN_FLOW,
  METHOD_LABEL,
  ROLE_LABEL,
  STAGE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
} from "./labels";
import type { AuditAction, JobAction, JobStatus, ItemCategory, Role } from "./types";

const allStatuses: JobStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "QUOTED",
  "APPROVED",
  "REPAIRING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
];
const categories: ItemCategory[] = ["PHONE", "COMPUTER", "CAR", "AIRCON"];
const roles: Role[] = ["ADMIN", "FRONT_DESK", "TECHNICIAN"];
const stages = ["INTAKE", "DIAGNOSIS", "BEFORE", "AFTER", "PAYMENT_SLIP"] as const;
const methods = ["CASH", "TRANSFER", "CARD"] as const;
const actions: JobAction[] = [
  "START_DIAGNOSIS",
  "SUBMIT_QUOTE",
  "APPROVE_QUOTE",
  "REJECT_QUOTE",
  "REQUOTE",
  "START_REPAIR",
  "MARK_READY",
  "COMPLETE",
  "CANCEL",
];
const auditActions: AuditAction[] = [
  "auth.login",
  "auth.login_failed",
  "user.create",
  "user.update",
  "job.create",
  "job.assign",
  "job.start_diagnosis",
  "job.submit_quote",
  "job.approve_quote",
  "job.reject_quote",
  "job.requote",
  "job.start_repair",
  "job.mark_ready",
  "job.complete",
  "job.cancel",
  "attachment.upload",
];

describe("labels", () => {
  it("labels every status in Thai and keeps the board order", () => {
    expect(STATUS_ORDER).toEqual(allStatuses);
    for (const status of allStatuses) expect(STATUS_LABEL[status]).toBeTruthy();
    expect(STATUS_LABEL.RECEIVED).toBe("รับงาน");
    expect(STATUS_LABEL.READY_FOR_PICKUP).toBe("รอชำระ/รับเครื่อง");
    expect(STATUS_LABEL.CANCELLED).toBe("ยกเลิก");
  });

  it("MAIN_FLOW is the 7 forward statuses without CANCELLED", () => {
    expect(MAIN_FLOW).toEqual(["RECEIVED", "DIAGNOSING", "QUOTED", "APPROVED", "REPAIRING", "READY_FOR_PICKUP", "COMPLETED"]);
    expect(MAIN_FLOW).not.toContain("CANCELLED");
  });

  it("labels categories and their identifier fields", () => {
    for (const category of categories) {
      expect(CATEGORY_LABEL[category]).toBeTruthy();
      expect(IDENTIFIER_LABEL[category]).toBeTruthy();
    }
    expect(CATEGORY_LABEL.AIRCON).toBe("เครื่องปรับอากาศ");
    expect(IDENTIFIER_LABEL.CAR).toBe("ทะเบียนรถ");
  });

  it("labels every role, stage and payment method", () => {
    for (const role of roles) expect(ROLE_LABEL[role]).toBeTruthy();
    for (const stage of stages) expect(STAGE_LABEL[stage]).toBeTruthy();
    for (const method of methods) expect(METHOD_LABEL[method]).toBeTruthy();
  });

  it("labels every job action and audit action", () => {
    for (const action of actions) expect(ACTION_LABEL[action]).toBeTruthy();
    for (const action of auditActions) expect(AUDIT_LABEL[action]).toBeTruthy();
    expect(Object.keys(ACTION_LABEL)).toHaveLength(actions.length);
    expect(Object.keys(AUDIT_LABEL)).toHaveLength(auditActions.length);
  });
});
