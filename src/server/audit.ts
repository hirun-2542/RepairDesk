import type { Prisma } from "@/generated/prisma/client";
export type AuditActor =
  | { kind: "USER"; id: string; name: string; role: string }
  | { kind: "CUSTOMER" }
  | { kind: "ANONYMOUS"; label: string };
const roleLabels: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  FRONT_DESK: "หน้าร้าน",
  TECHNICIAN: "ช่าง",
};
export async function writeAudit(
  tx: Prisma.TransactionClient,
  entry: {
    actor: AuditActor;
    action: string;
    entityType: string;
    entityId: string;
    jobId?: string;
    before?: unknown;
    after?: unknown;
  },
) {
  const { actor, ...data } = entry;
  return tx.auditLog.create({
    data: {
      ...data,
      actorType: actor.kind,
      actorId: actor.kind === "USER" ? actor.id : null,
      actorLabel:
        actor.kind === "USER"
          ? actor.name + " (" + roleLabels[actor.role] + ")"
          : actor.kind === "CUSTOMER"
            ? "ลูกค้า (ลิงก์ติดตามงาน)"
            : actor.label,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    },
  });
}
