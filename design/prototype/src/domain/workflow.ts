import type { Actor, JobAction, JobStatus, QuoteStatus } from "./types";

export type WorkflowContext = {
  status: JobStatus; technicianId: string | null;
  latestQuoteStatus: QuoteStatus | null; afterPhotoCount: number;
};
export type Check = { ok: true; to: JobStatus } | { ok: false; reason: string };

const WRONG_STATUS = "ไม่สามารถทำรายการนี้ในสถานะปัจจุบัน";
const NO_RIGHT = "ไม่มีสิทธิ์ทำรายการนี้";

const RULES: Record<JobAction, { from: JobStatus[]; to: JobStatus; who: "assignedTech" | "customerOrFront" | "front" }> = {
  START_DIAGNOSIS: { from: ["RECEIVED"], to: "DIAGNOSING", who: "assignedTech" },
  SUBMIT_QUOTE: { from: ["DIAGNOSING"], to: "QUOTED", who: "assignedTech" },
  APPROVE_QUOTE: { from: ["QUOTED"], to: "APPROVED", who: "customerOrFront" },
  REJECT_QUOTE: { from: ["QUOTED"], to: "QUOTED", who: "customerOrFront" },
  REQUOTE: { from: ["QUOTED"], to: "DIAGNOSING", who: "front" },
  START_REPAIR: { from: ["APPROVED"], to: "REPAIRING", who: "assignedTech" },
  MARK_READY: { from: ["REPAIRING"], to: "READY_FOR_PICKUP", who: "assignedTech" },
  COMPLETE: { from: ["READY_FOR_PICKUP"], to: "COMPLETED", who: "front" },
  CANCEL: { from: ["RECEIVED", "DIAGNOSING", "QUOTED"], to: "CANCELLED", who: "front" },
};

function roleOk(who: (typeof RULES)[JobAction]["who"], actor: Actor, ctx: WorkflowContext) {
  if (actor.kind === "CUSTOMER") return who === "customerOrFront";
  if (actor.role === "ADMIN") return true;
  if (who === "assignedTech") return actor.role === "TECHNICIAN" && actor.id === ctx.technicianId;
  return actor.role === "FRONT_DESK";
}

export function checkAction(action: JobAction, actor: Actor, ctx: WorkflowContext): Check {
  const r = RULES[action];
  if (!r.from.includes(ctx.status)) return { ok: false, reason: WRONG_STATUS };
  if (!roleOk(r.who, actor, ctx)) return { ok: false, reason: NO_RIGHT };
  if (action === "START_DIAGNOSIS" && !ctx.technicianId) return { ok: false, reason: "ยังไม่ได้มอบหมายช่าง" };
  if ((action === "APPROVE_QUOTE" || action === "REJECT_QUOTE") && ctx.latestQuoteStatus !== "PENDING")
    return { ok: false, reason: WRONG_STATUS };
  if (action === "REQUOTE" && ctx.latestQuoteStatus !== "REJECTED")
    return { ok: false, reason: "ลูกค้ายังไม่ได้ปฏิเสธใบเสนอราคา" };
  if (action === "MARK_READY" && ctx.afterPhotoCount < 1)
    return { ok: false, reason: "ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป" };
  return { ok: true, to: r.to };
}

/** Actions the actor could take in principle in this status (guards shown as disabled reasons in the UI). */
export function visibleActions(actor: Actor, ctx: WorkflowContext): JobAction[] {
  return (Object.keys(RULES) as JobAction[]).filter((a) => {
    const r = RULES[a];
    if (!r.from.includes(ctx.status) || !roleOk(r.who, actor, ctx)) return false;
    if ((a === "APPROVE_QUOTE" || a === "REJECT_QUOTE") && ctx.latestQuoteStatus !== "PENDING") return false;
    if (a === "REQUOTE" && ctx.latestQuoteStatus !== "REJECTED") return false;
    return true;
  });
}

export const canViewJob = (u: { id: string; role: string }, j: { technicianId: string | null }) =>
  u.role !== "TECHNICIAN" || j.technicianId === u.id;
export const canAssign = (u: { role: string }, s: JobStatus) =>
  u.role !== "TECHNICIAN" && ["RECEIVED", "DIAGNOSING", "APPROVED", "REPAIRING"].includes(s);
