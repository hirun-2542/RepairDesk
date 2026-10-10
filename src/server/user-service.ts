import bcrypt from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { writeAudit, type AuditActor } from "./audit";
import { DomainError } from "./errors";

const ROLES: readonly Role[] = ["ADMIN", "FRONT_DESK", "TECHNICIAN"];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Thai messages thrown as DomainError; the UI maps the field ones under their input. */
export const USER_ERRORS = {
  nameRequired: "กรุณากรอกชื่อ",
  emailInvalid: "อีเมลไม่ถูกต้อง",
  emailTaken: "อีเมลนี้ถูกใช้แล้ว",
  passwordShort: "รหัสผ่านอย่างน้อย 8 ตัวอักษร",
  roleInvalid: "บทบาทไม่ถูกต้อง",
  activeInvalid: "สถานะการใช้งานไม่ถูกต้อง",
  userNotFound: "ไม่พบผู้ใช้",
  selfEdit: "ไม่สามารถแก้ไขบัญชีของตัวเอง",
  forbidden: "ไม่มีสิทธิ์ทำรายการนี้",
} as const;

export type UserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};
export type UpdateUserPatch = { role?: Role; active?: boolean };
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
} as const;

/**
 * Admin authorization is resolved from the current database row — never from the
 * caller-supplied actor snapshot — so a deactivated or demoted admin is rejected
 * immediately, even with a still-valid JWT session.
 */
async function loadAdmin(tx: Prisma.TransactionClient, actor: AuditActor) {
  if (actor.kind !== "USER") throw new DomainError(USER_ERRORS.forbidden);
  const fresh = await tx.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!fresh || !fresh.active || fresh.role !== "ADMIN")
    throw new DomainError(USER_ERRORS.forbidden);
  return fresh;
}

export async function createUser(
  actor: AuditActor,
  input: UserInput,
): Promise<PublicUser> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role;

  if (!name) throw new DomainError(USER_ERRORS.nameRequired);
  if (!EMAIL_RE.test(email)) throw new DomainError(USER_ERRORS.emailInvalid);
  if (password.length < 8) throw new DomainError(USER_ERRORS.passwordShort);
  if (!ROLES.includes(role)) throw new DomainError(USER_ERRORS.roleInvalid);

  return prisma.$transaction(async (tx) => {
    const admin = await loadAdmin(tx, actor);
    if (await tx.user.findUnique({ where: { email }, select: { id: true } }))
      throw new DomainError(USER_ERRORS.emailTaken);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await tx.user.create({
      data: { name, email, passwordHash, role },
      select: publicSelect,
    });
    await writeAudit(tx, {
      actor: { kind: "USER", id: admin.id, name: admin.name, role: admin.role },
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      after: {
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
    return user;
  });
}

export async function updateUser(
  actor: AuditActor,
  id: string,
  patch: UpdateUserPatch,
): Promise<PublicUser> {
  if (patch.role !== undefined && !ROLES.includes(patch.role))
    throw new DomainError(USER_ERRORS.roleInvalid);
  if (patch.active !== undefined && typeof patch.active !== "boolean")
    throw new DomainError(USER_ERRORS.activeInvalid);

  return prisma.$transaction(async (tx) => {
    const admin = await loadAdmin(tx, actor);
    const target = await tx.user.findUnique({
      where: { id },
      select: publicSelect,
    });
    if (!target) throw new DomainError(USER_ERRORS.userNotFound);
    if (target.id === admin.id) throw new DomainError(USER_ERRORS.selfEdit);

    const before: { role?: Role; active?: boolean } = {};
    const after: { role?: Role; active?: boolean } = {};
    if (patch.role !== undefined && patch.role !== target.role) {
      before.role = target.role;
      after.role = patch.role;
    }
    if (patch.active !== undefined && patch.active !== target.active) {
      before.active = target.active;
      after.active = patch.active;
    }
    if (after.role === undefined && after.active === undefined) return target;

    const user = await tx.user.update({
      where: { id },
      data: {
        ...(after.role !== undefined && { role: after.role }),
        ...(after.active !== undefined && { active: after.active }),
      },
      select: publicSelect,
    });
    await writeAudit(tx, {
      actor: { kind: "USER", id: admin.id, name: admin.name, role: admin.role },
      action: "user.update",
      entityType: "User",
      entityId: user.id,
      before,
      after,
    });
    return user;
  });
}
