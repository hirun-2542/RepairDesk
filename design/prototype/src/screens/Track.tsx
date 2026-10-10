import { useState } from "react";
import { Check, Link2Off, ReceiptText, ShieldCheck, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { Banner, Dialog, StatusBadge, STATUS_ICON, Thumb } from "../components/ui";
import { QuoteView } from "../components/QuoteView";
import { CATEGORY_LABEL, MAIN_FLOW, METHOD_LABEL, STAGE_LABEL, STATUS_LABEL } from "../domain/labels";
import { formatTHB } from "../domain/money";
import type { JobStatus, Stage } from "../domain/types";
import { fmtDate } from "../lib/format";
import { useStore } from "../store";

const FOR_STATUS: Record<string, JobStatus> = { "job.create": "RECEIVED", "job.start_diagnosis": "DIAGNOSING", "job.submit_quote": "QUOTED", "job.approve_quote": "APPROVED", "job.start_repair": "REPAIRING", "job.mark_ready": "READY_FOR_PICKUP", "job.complete": "COMPLETED", "job.cancel": "CANCELLED" };
const FRIENDLY: Partial<Record<JobStatus, string>> = { RECEIVED: "ร้านรับเครื่องของคุณแล้ว", DIAGNOSING: "ช่างกำลังตรวจสอบอาการ", QUOTED: "ใบเสนอราคาพร้อมให้พิจารณา", APPROVED: "คุณอนุมัติแล้ว รอช่างเริ่มซ่อม", REPAIRING: "ช่างกำลังซ่อมเครื่องของคุณ", READY_FOR_PICKUP: "ซ่อมเสร็จแล้ว มารับเครื่องและชำระเงินได้เลย", COMPLETED: "ปิดงานเรียบร้อย ขอบคุณที่ใช้บริการ", CANCELLED: "งานนี้ถูกยกเลิก" };

export function Track({ token }: { token: string }) {
  const s = useStore();
  const job = s.jobs.find((j) => j.token === token);
  const [confirmReject, setConfirmReject] = useState(false);
  if (!job) return (
    <div className="track"><div className="track-top"><div className="brand">RepairDesk</div></div>
      <div className="card card-pad stack track-card" style={{ textAlign: "center", alignItems: "center", padding: 32 }}><Link2Off className="icon-lg" style={{ width: 40, height: 40, color: "var(--slate-500)" }} aria-hidden /><h1 style={{ fontSize: 20 }}>ไม่พบลิงก์ติดตามงาน</h1><p className="muted small">ลิงก์อาจไม่ถูกต้องหรือพิมพ์ผิด กรุณาตรวจสอบจากใบรับงาน หรือติดต่อร้านโดยแจ้งเลขที่งาน</p></div></div>
  );
  const events = s.audit.filter((e) => e.jobId === job.id && FOR_STATUS[e.action]);
  const when = (st: JobStatus) => events.filter((e) => FOR_STATUS[e.action] === st).at(-1)?.at;
  const idx = MAIN_FLOW.indexOf(job.status === "CANCELLED" ? "RECEIVED" : job.status);
  const q = job.quotes.at(-1); const pending = q?.status === "PENDING" && job.status === "QUOTED";
  const decide = (a: "APPROVE_QUOTE" | "REJECT_QUOTE") => { const r = s.perform(job.id, a, {}, { kind: "CUSTOMER" }); s.toast(r.ok ? "success" : "error", r.ok ? (a === "APPROVE_QUOTE" ? "อนุมัติใบเสนอราคาแล้ว ขอบคุณค่ะ" : "บันทึกการปฏิเสธแล้ว ร้านจะติดต่อกลับ") : (r as { error: string }).error); setConfirmReject(false); };
  const steps = job.status === "CANCELLED" ? (["RECEIVED", "CANCELLED"] as JobStatus[]) : MAIN_FLOW;
  return (
    <div className="track" style={{ paddingBottom: pending ? 0 : 24 }}>
      <header className="track-top">
        <div className="row between"><div className="brand"><span className="brand-mark"><Wrench className="icon-lg" /></span>RepairDesk</div><span className="small row" style={{ gap: 4, color: "#bae6fd" }}><ShieldCheck className="icon" aria-hidden />ลิงก์ส่วนตัว</span></div>
        <div style={{ marginTop: 20 }}><div className="small" style={{ color: "#bae6fd" }}>ติดตามงานซ่อม</div><h1 className="mono" style={{ color: "#fff" }}>{job.jobNo}</h1></div>
      </header>
      <main className="stack" style={{ padding: "0 0 16px" }}>
        <section className="card card-pad stack track-card" aria-label="สถานะปัจจุบัน">
          <div className="row between"><StatusBadge status={job.status} large /><span className="small muted">{fmtDate(job.updatedAt)}</span></div>
          <p className="strong" style={{ fontSize: 18 }}>{FRIENDLY[job.status]}</p>
          <div className="small muted">{CATEGORY_LABEL[job.category]} · {job.brand} {job.model}</div>
          {job.status === "CANCELLED" && job.cancelReason && <Banner kind="error">{job.cancelReason}</Banner>}
        </section>

        {pending && q && (
          <section className="stack" style={{ margin: "0 16px" }} aria-label="ใบเสนอราคา">
            <Banner kind="warn" title="กรุณาพิจารณาใบเสนอราคา">ช่างตรวจพบ: {job.diagnosis}</Banner>
            <QuoteView q={q} latest viewer="customer" />
          </section>
        )}
        {!pending && q && q.status !== "PENDING" && <section style={{ margin: "0 16px" }}><QuoteView q={q} latest viewer="customer" /></section>}

        <section className="card card-pad" style={{ margin: "0 16px" }} aria-label="ความคืบหน้า">
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>ความคืบหน้า</h2>
          <ol className="vstep">
            {steps.map((st, i) => {
              const I = STATUS_ICON[st]; const state = job.status === "CANCELLED" ? (st === "CANCELLED" ? "cur" : "done") : i < idx ? "done" : i === idx ? "cur" : "todo"; const d = when(st);
              return <li key={st} className={state} aria-current={state === "cur" ? "step" : undefined}><span className="node">{state === "done" ? <Check className="icon" aria-hidden /> : <I className="icon" aria-hidden />}</span><div><div className={state === "cur" ? "strong" : ""}>{STATUS_LABEL[st]}</div>{d && <div className="xs muted">{fmtDate(d)}</div>}</div></li>;
            })}
          </ol>
        </section>

        {job.attachments.length > 0 && (
          <section className="card card-pad" style={{ margin: "0 16px" }} aria-label="รูปภาพ">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>รูปภาพและเอกสาร</h2>
            <div className="thumbs" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>{job.attachments.filter((a) => a.stage !== "PAYMENT_SLIP").map((a) => <Thumb key={a.id} stage={a.stage as Stage} name={STAGE_LABEL[a.stage]} pdf={a.mime === "application/pdf"} />)}</div>
          </section>
        )}
        {job.payment && (
          <section className="card card-pad" style={{ margin: "0 16px" }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}><ReceiptText className="icon-lg" style={{ verticalAlign: "-4px" }} aria-hidden /> การชำระเงิน</h2>
            <div className="row between"><span className="muted">{job.payment.kind === "REPAIR" ? "ค่าซ่อม" : "ค่าตรวจเช็ค"} ({METHOD_LABEL[job.payment.method]})</span><span className="strong mono">{formatTHB(job.payment.amount)}</span></div>
            <div className="xs muted">ชำระเมื่อ {fmtDate(job.payment.paidAt)}</div>
          </section>
        )}
        <p className="xs muted" style={{ textAlign: "center", padding: "0 24px" }}>มีคำถามเกี่ยวกับงานนี้ ติดต่อร้านพร้อมแจ้งเลขที่งาน {job.jobNo}</p>
      </main>
      {pending && (
        <div className="track-bar">
          <button className="btn btn-secondary btn-lg" onClick={() => setConfirmReject(true)}><ThumbsDown className="icon" />ปฏิเสธ</button>
          <button className="btn btn-primary btn-lg" onClick={() => decide("APPROVE_QUOTE")}><ThumbsUp className="icon" />อนุมัติ {formatTHB(q!.total)}</button>
        </div>
      )}
      {confirmReject && <Dialog title="ปฏิเสธใบเสนอราคา?" onClose={() => setConfirmReject(false)} footer={<><button className="btn btn-secondary" onClick={() => setConfirmReject(false)}>กลับ</button><button className="btn btn-danger" onClick={() => decide("REJECT_QUOTE")}>ยืนยันปฏิเสธ</button></>}><p className="small">ร้านจะติดต่อคุณเพื่อเสนอราคาใหม่ หรือยกเลิกงานและคืนเครื่อง (อาจมีค่าตรวจเช็ค)</p></Dialog>}
    </div>
  );
}
