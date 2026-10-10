/** Pure domain vocabulary — no framework or database imports. */

export type Role = "ADMIN" | "FRONT_DESK" | "TECHNICIAN";

export type JobStatus =
  | "RECEIVED"
  | "DIAGNOSING"
  | "QUOTED"
  | "APPROVED"
  | "REPAIRING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type ItemCategory = "PHONE" | "COMPUTER" | "CAR" | "AIRCON";

export type QuoteStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LineType = "LABOR" | "PART";

export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";

export type PaymentKind = "REPAIR" | "INSPECTION_FEE";

export type AttachmentStage =
  | "INTAKE"
  | "DIAGNOSIS"
  | "BEFORE"
  | "AFTER"
  | "PAYMENT_SLIP";

export type Actor =
  | { kind: "USER"; id: string; role: Role; name: string }
  | { kind: "CUSTOMER" };

export type JobAction =
  | "START_DIAGNOSIS"
  | "SUBMIT_QUOTE"
  | "APPROVE_QUOTE"
  | "REJECT_QUOTE"
  | "REQUOTE"
  | "START_REPAIR"
  | "MARK_READY"
  | "COMPLETE"
  | "CANCEL";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "user.create"
  | "user.update"
  | "job.create"
  | "job.assign"
  | "job.start_diagnosis"
  | "job.submit_quote"
  | "job.approve_quote"
  | "job.reject_quote"
  | "job.requote"
  | "job.start_repair"
  | "job.mark_ready"
  | "job.complete"
  | "job.cancel"
  | "attachment.upload";
