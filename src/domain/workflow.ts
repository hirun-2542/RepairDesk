import type { Actor, JobAction, JobStatus, QuoteStatus } from "./types";

export type WorkflowContext = {
  status: JobStatus;
  technicianId: string | null;
  latestQuoteStatus: QuoteStatus | null;
  afterPhotoCount: number;
};

export type Check = { ok: true; to: JobStatus } | { ok: false; reason: string };

const WRONG_STATUS = "ไม่สามารถทำรายการนี้ในสถานะปัจจุบัน";
const NO_RIGHT = "ไม่มีสิทธิ์ทำรายการนี้";
const NO_TECHNICIAN = "ยังไม่ได้มอบหมายช่าง";
const QUOTE_NOT_REJECTED = "ลูกค้ายังไม่ได้ปฏิเสธใบเสนอราคา";
const NO_AFTER_PHOTO = "ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป";

type Who = "assignedTech" | "customerOrFront" | "front";

const RULES: Record<JobAction, { from: JobStatus[]; to: JobStatus; who: Who }> =
  {
    START_DIAGNOSIS: {
      from: ["RECEIVED"],
      to: "DIAGNOSING",
      who: "assignedTech",
    },
    SUBMIT_QUOTE: { from: ["DIAGNOSING"], to: "QUOTED", who: "assignedTech" },
    APPROVE_QUOTE: { from: ["QUOTED"], to: "APPROVED", who: "customerOrFront" },
    REJECT_QUOTE: { from: ["QUOTED"], to: "QUOTED", who: "customerOrFront" },
    REQUOTE: { from: ["QUOTED"], to: "DIAGNOSING", who: "front" },
    START_REPAIR: { from: ["APPROVED"], to: "REPAIRING", who: "assignedTech" },
    MARK_READY: {
      from: ["REPAIRING"],
      to: "READY_FOR_PICKUP",
      who: "assignedTech",
    },
    COMPLETE: { from: ["READY_FOR_PICKUP"], to: "COMPLETED", who: "front" },
    CANCEL: {
      from: ["RECEIVED", "DIAGNOSING", "QUOTED"],
      to: "CANCELLED",
      who: "front",
    },
  };

/** Admin passes every role check; "assigned tech" = Technician whose id equals the job's technicianId. */
function roleAllowed(who: Who, actor: Actor, ctx: WorkflowContext): boolean {
  if (actor.kind === "CUSTOMER") return who === "customerOrFront";
  if (actor.role === "ADMIN") return true;
  if (who === "assignedTech")
    return actor.role === "TECHNICIAN" && actor.id === ctx.technicianId;
  return actor.role === "FRONT_DESK";
}

export function checkAction(
  action: JobAction,
  actor: Actor,
  ctx: WorkflowContext,
): Check {
  const rule = RULES[action];
  if (!rule.from.includes(ctx.status))
    return { ok: false, reason: WRONG_STATUS };
  if (!roleAllowed(rule.who, actor, ctx))
    return { ok: false, reason: NO_RIGHT };
  if (action === "START_DIAGNOSIS" && !ctx.technicianId)
    return { ok: false, reason: NO_TECHNICIAN };
  if (
    (action === "APPROVE_QUOTE" || action === "REJECT_QUOTE") &&
    ctx.latestQuoteStatus !== "PENDING"
  ) {
    return { ok: false, reason: WRONG_STATUS };
  }
  if (action === "REQUOTE" && ctx.latestQuoteStatus !== "REJECTED") {
    return { ok: false, reason: QUOTE_NOT_REJECTED };
  }
  if (action === "MARK_READY" && ctx.afterPhotoCount < 1)
    return { ok: false, reason: NO_AFTER_PHOTO };
  return { ok: true, to: rule.to };
}

/**
 * Actions the actor could take in this status by role/permission — guard-failed ones stay in the
 * list so the UI can show them disabled with `checkAction`'s reason. REQUOTE is the exception:
 * it is hidden unless the latest quote was rejected.
 */
export function availableActions(
  actor: Actor,
  ctx: WorkflowContext,
): JobAction[] {
  return (Object.keys(RULES) as JobAction[]).filter((action) => {
    const rule = RULES[action];
    if (!rule.from.includes(ctx.status)) return false;
    if (!roleAllowed(rule.who, actor, ctx)) return false;
    if (action === "REQUOTE" && ctx.latestQuoteStatus !== "REJECTED")
      return false;
    return true;
  });
}
