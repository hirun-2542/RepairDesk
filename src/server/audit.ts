import type { Prisma } from "@/generated/prisma/client";
import { ROLE_LABEL } from "@/domain/labels";
import type { Actor } from "@/domain/types";

/** A staff/customer actor, plus the unauthenticated failed-login shape. */
export type AuditActor = Actor | { kind: "ANONYMOUS"; label: string };

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
          ? actor.name + " (" + ROLE_LABEL[actor.role] + ")"
          : actor.kind === "CUSTOMER"
            ? "ลูกค้า (ลิงก์ติดตามงาน)"
            : actor.label,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    },
  });
}
