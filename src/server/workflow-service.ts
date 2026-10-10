import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { checkAction, type WorkflowContext } from "@/domain/workflow";
import type { Actor, JobAction } from "@/domain/types";
import { requireActor } from "./authorization";
import { writeAudit } from "./audit";
import { DomainError, errorCode } from "./errors";
export const CONFLICT = "สถานะงานถูกเปลี่ยนแล้ว กรุณารีเฟรช";
export const workflowInclude = {
  quotes: { orderBy: { version: "desc" as const }, include: { lines: true } },
  attachments: true,
} as const;
export type WorkflowJob = Prisma.RepairJobGetPayload<{
  include: typeof workflowInclude;
}>;
export function buildWorkflowContext(job: WorkflowJob): WorkflowContext {
  return {
    status: job.status,
    technicianId: job.technicianId,
    latestQuoteStatus: job.quotes[0]?.status ?? null,
    afterPhotoCount: job.attachments.filter(
      (file) => file.stage === "AFTER" && file.mimeType.startsWith("image/"),
    ).length,
  };
}
const actionCodes: Record<JobAction, string> = {
  START_DIAGNOSIS: "job.start_diagnosis",
  SUBMIT_QUOTE: "job.submit_quote",
  APPROVE_QUOTE: "job.approve_quote",
  REJECT_QUOTE: "job.reject_quote",
  REQUOTE: "job.requote",
  START_REPAIR: "job.start_repair",
  MARK_READY: "job.mark_ready",
  COMPLETE: "job.complete",
  CANCEL: "job.cancel",
};
export async function mutateJob(
  actor: Actor,
  id: string,
  action: JobAction,
  expectedRevision: number | undefined,
  mutate?: (
    tx: Prisma.TransactionClient,
    job: WorkflowJob,
    actor: Actor,
  ) => Promise<{
    data?: Prisma.RepairJobUpdateManyMutationInput;
    after?: Record<string, unknown>;
    /** Entity actually changed by the callback; defaults to the RepairJob itself. */
    entityType?: "RepairJob" | "Quote" | "Payment";
    entityId?: string;
  }>,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const fresh =
        actor.kind === "USER" ? await requireActor(tx, actor) : actor;
      const job = await tx.repairJob.findUnique({
        where: { id },
        include: workflowInclude,
      });
      if (!job) throw new DomainError("ไม่พบงาน");
      if (expectedRevision !== undefined && job.revision !== expectedRevision)
        throw new DomainError(CONFLICT);
      const result = checkAction(action, fresh, buildWorkflowContext(job));
      if (!result.ok) throw new DomainError(result.reason);
      const extra = mutate ? await mutate(tx, job, fresh) : {};
      const changed = await tx.repairJob.updateMany({
        where: { id, status: job.status, revision: job.revision },
        data: { ...extra.data, status: result.to, revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new DomainError(CONFLICT);
      await writeAudit(tx, {
        actor: fresh,
        action: actionCodes[action],
        entityType: extra.entityType ?? "RepairJob",
        entityId: extra.entityId ?? id,
        jobId: id,
        before: { status: job.status },
        after: { status: result.to, ...extra.after },
      });
      return tx.repairJob.findUniqueOrThrow({ where: { id } });
    });
  } catch (error) {
    // Only genuine write contention becomes a stale-revision message. P2028 (generic
    // interactive-transaction failure: timeout, closed tx, …) is infrastructure and must
    // reach the caller unchanged so it is logged instead of disguised as a user conflict.
    if (["P2034", "SQLITE_BUSY"].includes(errorCode(error) ?? ""))
      throw new DomainError(CONFLICT);
    throw error;
  }
}
export async function startDiagnosis(
  actor: Actor,
  id: string,
  revision?: number,
) {
  return mutateJob(actor, id, "START_DIAGNOSIS", revision);
}
export async function startRepair(actor: Actor, id: string, revision?: number) {
  return mutateJob(actor, id, "START_REPAIR", revision);
}
export async function markReady(actor: Actor, id: string, revision?: number) {
  return mutateJob(actor, id, "MARK_READY", revision);
}
export async function requote(actor: Actor, id: string, revision?: number) {
  return mutateJob(actor, id, "REQUOTE", revision);
}
