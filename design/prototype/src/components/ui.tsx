import { useEffect, useRef, type ReactNode } from "react";
import {
  AirVent, BadgeCheck, Car, CircleAlert, CircleCheck, CircleX, FileClock, FileText, Inbox, Info, Laptop,
  PackageCheck, ScanSearch, Smartphone, Wrench, X, type LucideIcon,
} from "lucide-react";
import { CATEGORY_LABEL, MAIN_FLOW, STATUS_LABEL, STAGE_LABEL } from "../domain/labels";
import type { Category, JobStatus, Stage } from "../domain/types";
import { useStore } from "../store";

export const STATUS_ICON: Record<JobStatus, LucideIcon> = {
  RECEIVED: Inbox, DIAGNOSING: ScanSearch, QUOTED: FileClock, APPROVED: BadgeCheck,
  REPAIRING: Wrench, READY_FOR_PICKUP: PackageCheck, COMPLETED: CircleCheck, CANCELLED: CircleX,
};
export const CATEGORY_ICON: Record<Category, LucideIcon> = { PHONE: Smartphone, COMPUTER: Laptop, CAR: Car, AIRCON: AirVent };

export function StatusBadge({ status, large }: { status: JobStatus; large?: boolean }) {
  const I = STATUS_ICON[status];
  return (
    <span className={`badge st-${status} ${large ? "badge-lg" : ""}`}>
      <I className="icon" aria-hidden /> {STATUS_LABEL[status]}
    </span>
  );
}
export function CategoryIcon({ c }: { c: Category }) {
  const I = CATEGORY_ICON[c];
  return <span className="catico" title={CATEGORY_LABEL[c]}><I className="icon" aria-label={CATEGORY_LABEL[c]} /></span>;
}

export function Banner({ kind, children, title }: { kind: "error" | "warn" | "info" | "ok"; children: ReactNode; title?: string }) {
  const I = { error: CircleAlert, warn: CircleAlert, info: Info, ok: CircleCheck }[kind];
  return (
    <div className={`banner banner-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <I className="icon-lg" aria-hidden />
      <div>{title && <div className="strong">{title}</div>}{children}</div>
    </div>
  );
}

export function Field({ label, required, error, help, id, children }: { label: string; required?: boolean; error?: string; help?: string; id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden>*</span>}</label>
      {children}
      {error ? <div className="err" id={`${id}-err`}><CircleAlert className="icon" aria-hidden />{error}</div> : help ? <div className="help">{help}</div> : null}
    </div>
  );
}

export function Dialog({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,textarea,select,button.btn-primary,button")?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref} style={wide ? { width: "min(760px,100%)" } : undefined}>
        <div className="dialog-head"><h2>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="ปิด"><X className="icon-lg" /></button></div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-foot">{footer}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
          {t.kind === "error" ? <CircleAlert className="icon-lg" aria-hidden /> : <CircleCheck className="icon-lg" aria-hidden />}
          <span className="grow">{t.text}</span>
          <button className="iconbtn" style={{ color: "#fff" }} onClick={() => dismissToast(t.id)} aria-label="ปิดข้อความ"><X className="icon" /></button>
        </div>
      ))}
    </div>
  );
}

export function Stepper({ status }: { status: JobStatus }) {
  const idx = MAIN_FLOW.indexOf(status === "CANCELLED" ? "RECEIVED" : status);
  return (
    <ol className="stepper" aria-label="ความคืบหน้างาน">
      {MAIN_FLOW.map((s, i) => {
        const I = STATUS_ICON[s];
        const cls = status === "CANCELLED" ? "" : i < idx ? "done" : i === idx ? "cur" : "";
        return (
          <li key={s} className={`step ${cls}`} aria-current={cls === "cur" ? "step" : undefined}>
            <span className="node">{cls === "done" ? <CircleCheck className="icon" aria-hidden /> : <I className="icon" aria-hidden />}</span>
            <span>{STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

const TONE: Record<Stage, string> = { INTAKE: "#94a3b8", DIAGNOSIS: "#38bdf8", BEFORE: "#fb923c", AFTER: "#4ade80", PAYMENT_SLIP: "#a5b4fc" };
export function Thumb({ stage, name, pdf }: { stage: Stage; name: string; pdf?: boolean }) {
  return (
    <figure className="thumb" style={{ margin: 0 }}>
      <svg viewBox="0 0 120 76" role="img" aria-label={`${pdf ? "ไฟล์ PDF" : "รูปภาพ"} ${name}`}>
        <rect width="120" height="76" fill={TONE[stage]} opacity=".28" />
        {pdf ? <g fill="none" stroke="#334155" strokeWidth="2"><rect x="42" y="14" width="36" height="48" rx="3" /><path d="M50 30h20M50 38h20M50 46h12" /></g>
          : <g fill="none" stroke="#334155" strokeWidth="2"><rect x="30" y="16" width="60" height="44" rx="4" /><circle cx="48" cy="32" r="5" /><path d="M32 56l18-16 14 12 10-8 14 12" /></g>}
      </svg>
      <figcaption className="cap"><span className="strong" style={{ color: "var(--fg)" }}>{STAGE_LABEL[stage]}</span><br />{name}</figcaption>
    </figure>
  );
}

export function EmptyState({ icon: I = FileText, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty"><div className="ico"><I className="icon-lg" aria-hidden /></div><h3>{title}</h3>{children && <p className="small" style={{ maxWidth: 360 }}>{children}</p>}{action}</div>
  );
}
export const SkeletonRows = ({ n = 5 }: { n?: number }) => (
  <div className="stack-sm" style={{ padding: 20 }} aria-busy="true" aria-label="กำลังโหลด">
    {Array.from({ length: n }, (_, i) => <div key={i} className="skel" style={{ height: 18, width: `${92 - (i % 3) * 14}%` }} />)}
  </div>
);
