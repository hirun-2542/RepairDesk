import { prisma } from "@/lib/db";
import { decideQuote } from "./quote-service";
import { DomainError } from "./errors";
import type {
  AttachmentStage,
  ItemCategory,
  JobStatus,
  LineType,
  PaymentKind,
  PaymentMethod,
  QuoteStatus,
} from "@/domain/types";

/**
 * Public projection of a job for the no-login customer tracking link.
 *
 * Privacy boundary: this module is the only shape the tracking page ever reads. It selects
 * individual columns (never the full `JobDetail`) so staff names, audit before/after JSON,
 * internal notes and payment slips cannot leak into the page or its RSC payload.
 */

/** Friendly sentence per status shown to the customer — never internal wording. */
export const FRIENDLY_STATUS: Record<JobStatus, string> = {
  RECEIVED: "ร้านรับเครื่องของคุณแล้ว",
  DIAGNOSING: "ช่างกำลังตรวจสอบอาการ",
  QUOTED: "ใบเสนอราคาพร้อมให้พิจารณา",
  APPROVED: "คุณอนุมัติแล้ว รอช่างเริ่มซ่อม",
  REPAIRING: "ช่างกำลังซ่อมเครื่องของคุณ",
  READY_FOR_PICKUP: "ซ่อมเสร็จแล้ว มารับเครื่องและชำระเงินได้เลย",
  COMPLETED: "ปิดงานเรียบร้อย ขอบคุณที่ใช้บริการ",
  CANCELLED: "งานนี้ถูกยกเลิก",
};

/** Only forward/terminal transitions are progress history; reject/assign rows are excluded. */
const TIMELINE_STATUS: Record<string, JobStatus> = {
  "job.create": "RECEIVED",
  "job.start_diagnosis": "DIAGNOSING",
  "job.submit_quote": "QUOTED",
  "job.approve_quote": "APPROVED",
  "job.start_repair": "REPAIRING",
  "job.mark_ready": "READY_FOR_PICKUP",
  "job.complete": "COMPLETED",
  "job.cancel": "CANCELLED",
};

export type PublicQuoteLine = {
  type: LineType;
  description: string;
  qty: number;
  unitPrice: number;
};
export type PublicQuote = {
  version: number;
  status: QuoteStatus;
  subtotal: number;
  vat: number;
  total: number;
  lines: PublicQuoteLine[];
};
export type PublicAttachment = {
  id: string;
  stage: AttachmentStage;
  fileName: string;
  mimeType: string;
};
export type PublicPayment = {
  kind: PaymentKind;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
};
export type PublicTimelineEntry = { status: JobStatus; at: string };

export type PublicTracking = {
  token: string;
  jobNo: string;
  status: JobStatus;
  statusText: string;
  category: ItemCategory;
  brand: string;
  model: string;
  updatedAt: string;
  cancelReason: string | null;
  diagnosis: string | null;
  revision: number;
  /** Latest quote version, sanitized: no decider, no creator. */
  quote: PublicQuote | null;
  /** True only while the latest quote is PENDING and the job is QUOTED. */
  canDecide: boolean;
  /** Date + status only — no actor, no before/after. */
  timeline: PublicTimelineEntry[];
  /** Never includes PAYMENT_SLIP (bank details). */
  attachments: PublicAttachment[];
  /** No receiver, no slip. */
  payment: PublicPayment | null;
};

/** Returns the public projection, or null for any unknown/empty token (no information leak). */
export async function getPublicTracking(
  token: string,
): Promise<PublicTracking | null> {
  if (!token) return null;
  const job = await prisma.repairJob.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      trackingToken: true,
      jobNo: true,
      status: true,
      category: true,
      brand: true,
      model: true,
      updatedAt: true,
      cancelReason: true,
      diagnosis: true,
      revision: true,
      quotes: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          version: true,
          status: true,
          subtotal: true,
          vat: true,
          total: true,
          lines: {
            select: {
              type: true,
              description: true,
              qty: true,
              unitPrice: true,
            },
          },
        },
      },
      attachments: {
        where: { stage: { not: "PAYMENT_SLIP" } },
        orderBy: { createdAt: "asc" },
        select: { id: true, stage: true, fileName: true, mimeType: true },
      },
      payment: {
        select: { kind: true, method: true, amount: true, paidAt: true },
      },
    },
  });
  if (!job) return null;

  const timelineRows = await prisma.auditLog.findMany({
    where: { jobId: job.id, action: { in: Object.keys(TIMELINE_STATUS) } },
    orderBy: { at: "asc" },
    select: { action: true, at: true },
  });

  const quote = job.quotes[0] ?? null;
  return {
    token: job.trackingToken,
    jobNo: job.jobNo,
    status: job.status,
    statusText: FRIENDLY_STATUS[job.status],
    category: job.category,
    brand: job.brand,
    model: job.model,
    updatedAt: job.updatedAt.toISOString(),
    cancelReason: job.cancelReason,
    diagnosis: job.diagnosis,
    revision: job.revision,
    quote: quote
      ? {
          version: quote.version,
          status: quote.status,
          subtotal: quote.subtotal,
          vat: quote.vat,
          total: quote.total,
          lines: quote.lines.map((line) => ({
            type: line.type,
            description: line.description,
            qty: line.qty,
            unitPrice: line.unitPrice,
          })),
        }
      : null,
    canDecide: job.status === "QUOTED" && quote?.status === "PENDING",
    timeline: timelineRows.flatMap((row) => {
      const status = TIMELINE_STATUS[row.action];
      return status ? [{ status, at: row.at.toISOString() }] : [];
    }),
    attachments: job.attachments.map((file) => ({
      id: file.id,
      stage: file.stage,
      fileName: file.fileName,
      mimeType: file.mimeType,
    })),
    payment: job.payment
      ? {
          kind: job.payment.kind,
          method: job.payment.method,
          amount: job.payment.amount,
          paidAt: job.payment.paidAt.toISOString(),
        }
      : null,
  };
}

/**
 * Resolves the job from the token server-side (never trusts a client id) and records the
 * customer's decision through the shared workflow service.
 */
export async function decideByToken(
  token: string,
  decision: "APPROVE" | "REJECT",
  revision: number,
) {
  const job = await prisma.repairJob.findUnique({
    where: { trackingToken: token },
    select: { id: true },
  });
  if (!job) throw new DomainError("ไม่พบลิงก์ติดตามงาน");
  await decideQuote({ kind: "CUSTOMER" }, job.id, decision, revision);
}
