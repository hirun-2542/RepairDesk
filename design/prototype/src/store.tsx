import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { JOBS, NOW, USERS, seedAudit } from "./data/mock";
import { checkAction, type WorkflowContext } from "./domain/workflow";
import { computeQuoteTotals } from "./domain/money";
import { ROLE_LABEL } from "./domain/labels";
import type { Actor, AuditEntry, Category, Job, JobAction, LineType, PayMethod, Role, Stage, User } from "./domain/types";

export type Result = { ok: true } | { ok: false; error: string };
export interface Toast { id: number; kind: "success" | "error"; text: string }
export interface QuoteInput { diagnosis: string; lines: { type: LineType; description: string; qty: number; unitPrice: number }[] }
export interface Ctx {
  users: User[]; jobs: Job[]; audit: AuditEntry[]; me: User | null; actor: Actor | null; toasts: Toast[];
  login: (userId: string) => void; logout: () => void; dismissToast: (id: number) => void;
  toast: (kind: Toast["kind"], text: string) => void;
  ctxOf: (j: Job) => WorkflowContext;
  perform: (jobId: string, action: JobAction, payload?: Record<string, unknown>, actor?: Actor) => Result;
  assign: (jobId: string, techId: string) => Result;
  upload: (jobId: string, stage: Stage, file: { name: string; type: string; size: number }) => Result;
  createJob: (i: { phone: string; name: string; category: Category; brand: string; model: string; identifier: string; symptom: string; accessories: string; technicianId: string }) => string;
  updateUser: (id: string, patch: Partial<Pick<User, "role" | "active">>) => Result;
  createUser: (u: { name: string; email: string; password: string; role: Role }) => Result;
}
const C = createContext<Ctx>(null as never);
export const useStore = () => useContext(C);

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const nowIso = () => new Date(NOW + 60_000).toISOString();

export function StoreProvider({ initialUser, children }: { initialUser: string | null; children: ReactNode }) {
  const [users, setUsers] = useState(USERS);
  const [jobs, setJobs] = useState(JOBS);
  const [audit, setAudit] = useState(seedAudit);
  const [meId, setMeId] = useState<string | null>(initialUser);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const me = users.find((u) => u.id === meId && u.active) ?? null;
  const actor: Actor | null = me && { kind: "USER", id: me.id, role: me.role, name: me.name };

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const log = useCallback((a: Actor, action: string, entityType: string, jobId: string | undefined, before?: Record<string, unknown>, after?: Record<string, unknown>) => {
    const label = a.kind === "CUSTOMER" ? "ลูกค้า (ลิงก์ติดตามงาน)" : `${a.name} (${ROLE_LABEL[a.role]})`;
    setAudit((l) => [...l, { id: `n${l.length}`, at: nowIso(), actorType: a.kind, actorLabel: label, action, entityType, jobId, before, after }]);
  }, []);
  const ctxOf = useCallback((j: Job): WorkflowContext => ({
    status: j.status, technicianId: j.technicianId,
    latestQuoteStatus: j.quotes.at(-1)?.status ?? null,
    afterPhotoCount: j.attachments.filter((a) => a.stage === "AFTER").length,
  }), []);

  const patch = (id: string, fn: (j: Job) => Job) => setJobs((js) => js.map((j) => (j.id === id ? fn({ ...j, updatedAt: nowIso() }) : j)));

  const perform: Ctx["perform"] = (jobId, action, payload = {}, who) => {
    const a = who ?? actor;
    const j = jobs.find((x) => x.id === jobId);
    if (!a || !j) return { ok: false, error: "ไม่พบงาน" };
    const chk = checkAction(action, a, ctxOf(j));
    if (!chk.ok) return { ok: false, error: chk.reason };
    const onBehalf = a.kind === "USER" && (action === "APPROVE_QUOTE" || action === "REJECT_QUOTE") ? { onBehalfOfCustomer: true } : {};
    const decidedBy = a.kind === "CUSTOMER" ? "ลูกค้า" : a.name;
    const audited = (key: string, before: object, after: object) => log(a, key, action === "COMPLETE" ? "Payment" : action === "SUBMIT_QUOTE" || action.endsWith("_QUOTE") ? "Quote" : "RepairJob", j.id, before as never, after as never);
    switch (action) {
      case "SUBMIT_QUOTE": {
        const q = payload as unknown as QuoteInput;
        if (!q.diagnosis.trim()) return { ok: false, error: "กรุณากรอกผลการตรวจสอบ" };
        if (!q.lines.length || q.lines.some((l) => !l.description.trim() || l.qty < 1)) return { ok: false, error: "กรุณากรอกรายการให้ครบอย่างน้อย 1 รายการ" };
        const t = computeQuoteTotals(q.lines);
        patch(j.id, (x) => ({ ...x, status: "QUOTED", diagnosis: q.diagnosis, quotes: [...x.quotes, { version: x.quotes.length + 1, status: "PENDING", lines: q.lines, ...t, createdAt: nowIso() }] }));
        audited("job.submit_quote", { status: j.status }, { status: "QUOTED", quoteVersion: j.quotes.length + 1, total: t.total });
        break;
      }
      case "APPROVE_QUOTE":
      case "REJECT_QUOTE": {
        const ok = action === "APPROVE_QUOTE";
        patch(j.id, (x) => ({ ...x, status: ok ? "APPROVED" : "QUOTED", quotes: x.quotes.map((q, i) => i === x.quotes.length - 1 ? { ...q, status: ok ? "APPROVED" : "REJECTED", decidedAt: nowIso(), decidedBy } : q) }));
        audited(ok ? "job.approve_quote" : "job.reject_quote", { status: "QUOTED" }, { status: ok ? "APPROVED" : "QUOTED", quoteVersion: j.quotes.length, ...onBehalf });
        break;
      }
      case "COMPLETE": {
        const method = payload.method as PayMethod;
        const q = j.quotes.at(-1)!;
        if (method === "TRANSFER" && !j.attachments.some((x) => x.stage === "PAYMENT_SLIP")) return { ok: false, error: "กรุณาแนบสลิปการโอนก่อน" };
        patch(j.id, (x) => ({ ...x, status: "COMPLETED", payment: { kind: "REPAIR", method, amount: q.total, reference: (payload.reference as string) || undefined, paidAt: nowIso(), receivedBy: (a as { name: string }).name } }));
        audited("job.complete", { status: j.status }, { status: "COMPLETED", method, amount: q.total });
        break;
      }
      case "CANCEL": {
        const reason = String(payload.reason ?? "").trim();
        const fee = Number(payload.feeSatang ?? 0);
        if (!reason) return { ok: false, error: "กรุณาระบุเหตุผลการยกเลิก" };
        if (fee > 0 && !payload.method) return { ok: false, error: "กรุณาเลือกวิธีรับชำระค่าตรวจเช็ค" };
        patch(j.id, (x) => ({ ...x, status: "CANCELLED", cancelReason: reason, payment: fee > 0 ? { kind: "INSPECTION_FEE", method: payload.method as PayMethod, amount: fee, paidAt: nowIso(), receivedBy: (a as { name: string }).name } : undefined }));
        audited("job.cancel", { status: j.status }, { status: "CANCELLED", reason, inspectionFee: fee });
        break;
      }
      default: {
        const key = { START_DIAGNOSIS: "job.start_diagnosis", REQUOTE: "job.requote", START_REPAIR: "job.start_repair", MARK_READY: "job.mark_ready" }[action as "START_DIAGNOSIS"]!;
        patch(j.id, (x) => ({ ...x, status: chk.to }));
        audited(key, { status: j.status }, { status: chk.to });
      }
    }
    return { ok: true };
  };

  const assign: Ctx["assign"] = (jobId, techId) => {
    if (!actor) return { ok: false, error: "ไม่มีสิทธิ์ทำรายการนี้" };
    const t = users.find((u) => u.id === techId);
    const j = jobs.find((x) => x.id === jobId)!;
    if (!t || !t.active || t.role !== "TECHNICIAN") return { ok: false, error: "ช่างที่เลือกไม่พร้อมใช้งาน" };
    const prev = users.find((u) => u.id === j.technicianId)?.name ?? null;
    patch(jobId, (x) => ({ ...x, technicianId: techId }));
    log(actor, "job.assign", "RepairJob", jobId, { technician: prev }, { technician: t.name });
    return { ok: true };
  };

  const upload: Ctx["upload"] = (jobId, stage, f) => {
    if (!actor || actor.kind !== "USER") return { ok: false, error: "ไม่มีสิทธิ์ทำรายการนี้" };
    if (!ALLOWED.includes(f.type)) return { ok: false, error: "ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF" };
    if (f.size > 10 * 1024 * 1024) return { ok: false, error: "ไฟล์ใหญ่เกิน 10MB" };
    if (f.size === 0) return { ok: false, error: "ไฟล์ว่างเปล่า" };
    patch(jobId, (x) => ({ ...x, attachments: [...x.attachments, { id: `u${Math.random()}`, stage, fileName: f.name, mime: f.type, size: f.size, uploadedBy: actor.name, at: nowIso() }] }));
    log(actor, "attachment.upload", "Attachment", jobId, undefined, { stage, fileName: f.name, size: f.size });
    return { ok: true };
  };

  const createJob: Ctx["createJob"] = (i) => {
    const n = jobs.length + 1;
    const id = `j${n}`;
    const job: Job = {
      id, jobNo: `RJ-2026-${String(n).padStart(4, "0")}`, token: `new${n}Z8qLm4VnR2xYc7Hb1PdKfS9aW3x`.slice(0, 32),
      customer: { name: i.name, phone: i.phone }, category: i.category, brand: i.brand, model: i.model,
      identifier: i.identifier || undefined, symptom: i.symptom, accessories: i.accessories || undefined,
      status: "RECEIVED", technicianId: i.technicianId || null, createdAt: nowIso(), updatedAt: nowIso(), quotes: [], attachments: [],
    };
    setJobs((js) => [job, ...js]);
    if (actor) log(actor, "job.create", "RepairJob", id, undefined, { status: "RECEIVED", jobNo: job.jobNo });
    return id;
  };

  const updateUser: Ctx["updateUser"] = (id, p) => {
    if (!actor || actor.kind !== "USER") return { ok: false, error: "ไม่มีสิทธิ์ทำรายการนี้" };
    if (id === actor.id) return { ok: false, error: "ไม่สามารถแก้ไขบัญชีของตัวเอง" };
    const u = users.find((x) => x.id === id)!;
    setUsers((us) => us.map((x) => (x.id === id ? { ...x, ...p } : x)));
    log(actor, "user.update", "User", undefined, { user: u.name, ...Object.fromEntries(Object.keys(p).map((k) => [k, u[k as "role"]])) }, { user: u.name, ...p });
    return { ok: true };
  };
  const createUser: Ctx["createUser"] = (u) => {
    if (!actor || actor.kind !== "USER") return { ok: false, error: "ไม่มีสิทธิ์ทำรายการนี้" };
    if (users.some((x) => x.email === u.email)) return { ok: false, error: "อีเมลนี้ถูกใช้แล้ว" };
    setUsers((us) => [...us, { id: `u${us.length + 1}`, name: u.name, email: u.email, role: u.role, active: true }]);
    log(actor, "user.create", "User", undefined, undefined, { name: u.name, email: u.email, role: u.role });
    return { ok: true };
  };

  const value: Ctx = useMemo(() => ({
    users, jobs, audit, me, actor, toasts, toast, ctxOf, perform, assign, upload, createJob, updateUser, createUser,
    login: (id) => { setMeId(id); },
    logout: () => setMeId(null),
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [users, jobs, audit, me, toasts]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
