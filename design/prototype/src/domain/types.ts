export type Role = "ADMIN" | "FRONT_DESK" | "TECHNICIAN";
export type JobStatus =
  | "RECEIVED" | "DIAGNOSING" | "QUOTED" | "APPROVED"
  | "REPAIRING" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED";
export type Category = "PHONE" | "COMPUTER" | "CAR" | "AIRCON";
export type QuoteStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LineType = "LABOR" | "PART";
export type PayMethod = "CASH" | "TRANSFER" | "CARD";
export type PayKind = "REPAIR" | "INSPECTION_FEE";
export type Stage = "INTAKE" | "DIAGNOSIS" | "BEFORE" | "AFTER" | "PAYMENT_SLIP";

export interface User { id: string; name: string; email: string; role: Role; active: boolean }
export interface QuoteLine { type: LineType; description: string; qty: number; unitPrice: number }
export interface Quote {
  version: number; status: QuoteStatus; lines: QuoteLine[];
  subtotal: number; vat: number; total: number; note?: string;
  createdAt: string; decidedAt?: string; decidedBy?: string; // user name, or "CUSTOMER"
}
export interface Attachment { id: string; stage: Stage; fileName: string; mime: string; size: number; uploadedBy: string; at: string }
export interface Payment { kind: PayKind; method: PayMethod; amount: number; reference?: string; paidAt: string; receivedBy: string }
export interface Job {
  id: string; jobNo: string; token: string;
  customer: { name: string; phone: string };
  category: Category; brand: string; model: string; identifier?: string;
  symptom: string; accessories?: string;
  status: JobStatus; technicianId: string | null;
  diagnosis?: string; cancelReason?: string;
  createdAt: string; updatedAt: string;
  quotes: Quote[]; attachments: Attachment[]; payment?: Payment;
}
export interface AuditEntry {
  id: string; at: string; actorType: "USER" | "CUSTOMER" | "ANONYMOUS"; actorLabel: string;
  action: string; entityType: string; jobId?: string;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
}

export type Actor = { kind: "USER"; id: string; role: Role; name: string } | { kind: "CUSTOMER" };
export type JobAction =
  | "START_DIAGNOSIS" | "SUBMIT_QUOTE" | "APPROVE_QUOTE" | "REJECT_QUOTE" | "REQUOTE"
  | "START_REPAIR" | "MARK_READY" | "COMPLETE" | "CANCEL";
