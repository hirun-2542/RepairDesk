import { describe, expect, it } from "vitest";
import type { JobStatus, Role } from "./types";
import { canAssign, canManageUsers, canViewJob, uploadableStages } from "./permissions";

const user = (id: string, role: Role) => ({ id, role });

describe("canViewJob", () => {
  it("lets Admin and Front Desk view any job", () => {
    expect(canViewJob(user("u-admin", "ADMIN"), { technicianId: null })).toBe(true);
    expect(canViewJob(user("u-front", "FRONT_DESK"), { technicianId: "t1" })).toBe(true);
  });

  it("lets a Technician view only their assigned job", () => {
    expect(canViewJob(user("t1", "TECHNICIAN"), { technicianId: "t1" })).toBe(true);
    expect(canViewJob(user("t1", "TECHNICIAN"), { technicianId: "t2" })).toBe(false);
    expect(canViewJob(user("t1", "TECHNICIAN"), { technicianId: null })).toBe(false);
  });
});

describe("canAssign", () => {
  const assignable: JobStatus[] = ["RECEIVED", "DIAGNOSING", "APPROVED", "REPAIRING"];
  const locked: JobStatus[] = ["QUOTED", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];

  it.each(assignable)("Admin and Front Desk can assign in %s", (status) => {
    expect(canAssign(user("u-admin", "ADMIN"), status)).toBe(true);
    expect(canAssign(user("u-front", "FRONT_DESK"), status)).toBe(true);
  });

  it.each(locked)("no one can assign in %s", (status) => {
    expect(canAssign(user("u-admin", "ADMIN"), status)).toBe(false);
    expect(canAssign(user("u-front", "FRONT_DESK"), status)).toBe(false);
  });

  it("Technicians can never assign", () => {
    for (const status of [...assignable, ...locked]) {
      expect(canAssign(user("t1", "TECHNICIAN"), status)).toBe(false);
    }
  });
});

describe("uploadableStages", () => {
  it("Front Desk uploads intake and payment slip only", () => {
    expect(uploadableStages(user("u-front", "FRONT_DESK"), { technicianId: "t1", status: "REPAIRING" })).toEqual([
      "INTAKE",
      "PAYMENT_SLIP",
    ]);
  });

  it("the assigned Technician uploads diagnosis, before and after", () => {
    expect(uploadableStages(user("t1", "TECHNICIAN"), { technicianId: "t1", status: "REPAIRING" })).toEqual([
      "DIAGNOSIS",
      "BEFORE",
      "AFTER",
    ]);
  });

  it("an unassigned Technician uploads nothing", () => {
    expect(uploadableStages(user("t2", "TECHNICIAN"), { technicianId: "t1", status: "REPAIRING" })).toEqual([]);
    expect(uploadableStages(user("t1", "TECHNICIAN"), { technicianId: null, status: "RECEIVED" })).toEqual([]);
  });

  it("Admin uploads every stage", () => {
    expect(uploadableStages(user("u-admin", "ADMIN"), { technicianId: null, status: "RECEIVED" })).toEqual([
      "INTAKE",
      "DIAGNOSIS",
      "BEFORE",
      "AFTER",
      "PAYMENT_SLIP",
    ]);
  });

  it("a closed job accepts no uploads from anyone", () => {
    for (const role of ["ADMIN", "FRONT_DESK", "TECHNICIAN"] as Role[]) {
      expect(uploadableStages(user("u", role), { technicianId: "u", status: "COMPLETED" })).toEqual([]);
      expect(uploadableStages(user("u", role), { technicianId: "u", status: "CANCELLED" })).toEqual([]);
    }
  });
});

describe("canManageUsers", () => {
  it("is Admin only", () => {
    expect(canManageUsers(user("u-admin", "ADMIN"))).toBe(true);
    expect(canManageUsers(user("u-front", "FRONT_DESK"))).toBe(false);
    expect(canManageUsers(user("t1", "TECHNICIAN"))).toBe(false);
  });
});
