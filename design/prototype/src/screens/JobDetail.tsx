import { useRef, useState } from "react";
import { Ban, CircleAlert, Clock, Copy, History, Link2, Paperclip, Phone, Printer, ReceiptText, ShieldAlert, Upload, UserRound, Wrench } from "lucide-react";
import { Banner, CategoryIcon, EmptyState, Stepper, StatusBadge, Thumb, STATUS_ICON } from "../components/ui";
import { QuoteView } from "../components/QuoteView";
import { ACTION_LABEL, AUDIT_LABEL, CATEGORY_LABEL, IDENTIFIER_LABEL, METHOD_LABEL, STAGE_LABEL } from "../domain/labels";
import { formatTHB } from "../domain/money";
import { canAssign, canViewJob, checkAction, visibleActions } from "../domain/workflow";
import { uploadableStages } from "../domain/permissions";
import type { JobAction, Stage } from "../domain/types";
import { fmtDate } from "../lib/format";
import { go, Link } from "../lib/router";
import { useStore } from "../store";
import { CancelDialog, CompleteDialog, QuoteDialog } from "./JobDialogs";
import { NotFound } from "./Misc";

type Dlg = "quote" | "complete" | "cancel" | null;
const WAITING: Record<string, string> = {
  RECEIVED: "รอช่างที่ได้รับมอบหมายเริ่มตรวจสอบ", DIAGNOSING: "รอช่างส่งใบเสนอราคา", QUOTED: "รอลูกค้าอนุมัติใบเสนอราคา",
  APPROVED: "รอช่างเริ่มซ่อม", REPAIRING: "รอช่างซ่อมเสร็จและแนบรูปหลังซ่อม", READY_FOR_PICKUP: "รอหน้าร้านรับชำระเงินและส่งมอบเครื่อง",
};

export function JobDetail({ id, dialog }: { id: string; dialog: string | null }) {
  const s = useStore();
  const job = s.jobs.find((j) => j.id === id);
  const [dlg, setDlg] = useState<Dlg>((dialog as Dlg) ?? null);
  const [stage, setStage] = useState<Stage | "">("");
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  if (!job || !s.me || !s.actor || !canViewJob(s.me, job)) return <NotFound />;
  const me = s.me, actor = s.actor, ctx = s.ctxOf(job);
  const tech = s.users.find((u) => u.id === job.technicianId);
  const stages = uploadableStages(me, job);
  const actions = visibleActions(actor, ctx);
  const closed = job.status === "COMPLETED" || job.status === "CANCELLED";
  const trackUrl = `${location.origin}/#/track/${job.token}`;
  const events = s.audit.filter((e) => e.jobId === job.id);
  const done = (r: { ok: boolean; error?: string }, ok: string) => { if (r.ok) { s.toast("success", ok); setDlg(null); } else s.toast("error", (r as { error: string }).error); };

  const run = (a: JobAction, msg: string, payload?: Record<string, unknown>) => done(s.perform(job.id, a, payload), msg);
  const doUpload = (f?: File) => {
    if (!f) return; setUpErr(null);
    const st = (stage || stages[0]) as Stage;
    setBusy(true);
    setTimeout(() => { const r = s.upload(job.id, st, { name: f.name, type: f.type, size: f.size }); setBusy(false); if (r.ok) s.toast("success", "แนบไฟล์เรียบร้อย"); else setUpErr((r as { error: string }).error); }, 500);
  };

  const primary: Partial<Record<JobAction, string>> = { START_DIAGNOSIS: "btn-primary", SUBMIT_QUOTE: "btn-primary", START_REPAIR: "btn-primary", MARK_READY: "btn-primary", COMPLETE: "btn-primary", APPROVE_QUOTE: "btn-secondary", REJECT_QUOTE: "btn-secondary", REQUOTE: "btn-primary", CANCEL: "btn-danger-outline" };
  const click = (a: JobAction) => {
    if (a === "SUBMIT_QUOTE") setDlg("quote"); else if (a === "COMPLETE") setDlg("complete"); else if (a === "CANCEL") setDlg("cancel");
    else run(a, `${ACTION_LABEL[a].replace(" (แทนลูกค้า)", "")} เรียบร้อย`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumbs"><Link to="/jobs">กระดานงาน</Link> / {job.jobNo}</div>
          <div className="row wrap"><h1 className="mono">{job.jobNo}</h1><StatusBadge status={job.status} large /></div>
          <p className="muted small">{CATEGORY_LABEL[job.category]} · {job.brand} {job.model} · รับเมื่อ {fmtDate(job.createdAt)}</p>
        </div>
        <div className="row wrap no-print">
          <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(trackUrl); s.toast("success", "คัดลอกลิงก์ติดตามงานแล้ว"); }}><Copy className="icon" />คัดลอกลิงก์ติดตามงาน</button>
          <Link className="btn btn-secondary" to={`/jobs/${job.id}/receipt`}><Printer className="icon" />พิมพ์ใบรับงาน/ใบเสร็จ</Link>
        </div>
      </div>
      <span data-testid="tracking-link" className="sr-only">{trackUrl}</span>

      <div className="detail">
        <div className="stack">
          {job.status === "CANCELLED" ? (
            <Banner kind="error" title="งานนี้ถูกยกเลิก">{job.cancelReason}{job.payment?.kind === "INSPECTION_FEE" && ` · เก็บค่าตรวจเช็ค ${formatTHB(job.payment.amount)} (${METHOD_LABEL[job.payment.method]})`}</Banner>
          ) : <div className="card card-pad"><Stepper status={job.status} /></div>}

          <div className="card">
            <div className="card-head"><h2><Wrench className="icon-lg" aria-hidden />ดำเนินการ</h2><span className="small muted">บทบาทของคุณ: {me.name}</span></div>
            <div className="card-pad stack">
              {closed ? <p className="muted small">งานนี้ปิดแล้ว ไม่มีรายการที่ต้องดำเนินการ และไม่สามารถแนบไฟล์เพิ่ม</p> : actions.length === 0 ? (
                <Banner kind="info" title="ไม่มีรายการที่คุณต้องทำในขั้นนี้">{WAITING[job.status]}{tech && ` (ช่าง: ${tech.name})`}</Banner>
              ) : (
                <>
                  {job.status === "QUOTED" && ctx.latestQuoteStatus === "REJECTED" && <Banner kind="warn" title="ลูกค้าปฏิเสธใบเสนอราคา">เลือก “เสนอราคาใหม่” เพื่อให้ช่างทำใบเสนอราคาเวอร์ชันถัดไป หรือยกเลิกงาน</Banner>}
                  <div className="actions">
                    {actions.map((a) => {
                      const chk = checkAction(a, actor, ctx); const I = a === "CANCEL" ? Ban : STATUS_ICON[job.status];
                      return (
                        <div key={a} className="stack-sm" style={{ gap: 4 }}>
                          <button className={`btn btn-lg ${primary[a]}`} disabled={!chk.ok} onClick={() => click(a)}><I className="icon" />{ACTION_LABEL[a]}</button>
                          {!chk.ok && <span className="err xs"><CircleAlert className="icon" />{chk.reason}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2><ReceiptText className="icon-lg" aria-hidden />ใบเสนอราคา</h2><span className="small muted">{job.quotes.length} เวอร์ชัน</span></div>
            <div className="card-pad">
              {job.diagnosis && <div style={{ marginBottom: 12 }}><div className="label">ผลการตรวจสอบ</div><p className="small">{job.diagnosis}</p></div>}
              {job.quotes.length === 0 ? <EmptyState icon={ReceiptText} title="ยังไม่มีใบเสนอราคา">ช่างที่รับผิดชอบจะสร้างใบเสนอราคาหลังตรวจสอบเสร็จ</EmptyState>
                : [...job.quotes].reverse().map((q, i) => <QuoteView key={q.version} q={q} latest={i === 0} />)}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2><Paperclip className="icon-lg" aria-hidden />ไฟล์แนบ</h2><span className="small muted">{job.attachments.length} ไฟล์</span></div>
            <div className="card-pad stack">
              {job.attachments.length === 0 ? <p className="muted small">ยังไม่มีไฟล์แนบ</p> : (Object.keys(STAGE_LABEL) as Stage[]).map((st) => {
                const fs = job.attachments.filter((a) => a.stage === st);
                return fs.length ? <div key={st}><div className="label" style={{ marginBottom: 6 }}>{STAGE_LABEL[st]}</div><div className="thumbs">{fs.map((a) => <Thumb key={a.id} stage={a.stage} name={a.fileName} pdf={a.mime === "application/pdf"} />)}</div></div> : null;
              })}
              {stages.length > 0 ? (
                <div className="stack-sm no-print" style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div className="grid-2" style={{ alignItems: "end" }}>
                    <div className="field"><label htmlFor="stage">แนบเป็นขั้นตอน</label>
                      <select id="stage" className="select" value={stage || stages[0]} onChange={(e) => setStage(e.target.value as Stage)}>{stages.map((x) => <option key={x} value={x}>{STAGE_LABEL[x]}</option>)}</select></div>
                  </div>
                  <div className={`dropzone`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); doUpload(e.dataTransfer.files[0]); }}>
                    {busy ? <div className="stack-sm" aria-busy="true"><span>กำลังอัปโหลด…</span><div className="progress"><i style={{ width: "65%" }} /></div></div> : (
                      <><Upload className="icon-lg" aria-hidden /><div>ลากไฟล์มาวางที่นี่ หรือ <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}>เลือกไฟล์</button></div><div className="xs">JPG, PNG, WEBP, PDF · ไม่เกิน 10 MB</div></>
                    )}
                    <input ref={file} type="file" hidden data-testid="file-input" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { doUpload(e.target.files?.[0]); e.target.value = ""; }} />
                  </div>
                  {upErr && <Banner kind="error" title="อัปโหลดไม่สำเร็จ">{upErr}</Banner>}
                </div>
              ) : <p className="xs muted"><ShieldAlert className="icon" style={{ verticalAlign: "-3px" }} /> {closed ? "งานปิดแล้ว ไม่สามารถแนบไฟล์เพิ่ม" : "บทบาท/งานนี้ไม่มีสิทธิ์แนบไฟล์"}</p>}
            </div>
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="card-head"><h3><UserRound className="icon-lg" aria-hidden />ลูกค้าและอุปกรณ์</h3><CategoryIcon c={job.category} /></div>
            <dl className="kv card-pad">
              <dt>ลูกค้า</dt><dd>{job.customer.name}</dd>
              <dt>โทรศัพท์</dt><dd><Phone className="icon" style={{ verticalAlign: "-3px" }} /> {job.customer.phone}</dd>
              <dt>ประเภท</dt><dd>{CATEGORY_LABEL[job.category]}</dd>
              <dt>ยี่ห้อ/รุ่น</dt><dd>{job.brand} {job.model}</dd>
              {job.identifier && <><dt>{IDENTIFIER_LABEL[job.category]}</dt><dd className="mono">{job.identifier}</dd></>}
              <dt>อาการ</dt><dd>{job.symptom}</dd>
              {job.accessories && <><dt>อุปกรณ์มาด้วย</dt><dd>{job.accessories}</dd></>}
            </dl>
          </div>

          <div className="card">
            <div className="card-head"><h3><Wrench className="icon-lg" aria-hidden />ช่างผู้รับผิดชอบ</h3></div>
            <div className="card-pad stack-sm">
              {canAssign(me, job.status) ? (
                <div className="field"><label htmlFor="assign" className="sr-only">มอบหมายช่าง</label>
                  <select id="assign" className="select" value={job.technicianId ?? ""} onChange={(e) => { const r = s.assign(job.id, e.target.value); done(r, "มอบหมายช่างเรียบร้อย"); }}>
                    <option value="" disabled>เลือกช่าง</option>{s.users.filter((u) => u.role === "TECHNICIAN" && u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  <span className="help">เปลี่ยนช่างได้จนกว่าจะซ่อมเสร็จ</span></div>
              ) : <div>{tech?.name ?? <span className="muted">ยังไม่มอบหมาย</span>}</div>}
            </div>
          </div>

          {job.payment && (
            <div className="card"><div className="card-head"><h3>การชำระเงิน</h3><span className={`badge ${job.payment.kind === "REPAIR" ? "st-COMPLETED" : "st-QUOTED"}`}>{job.payment.kind === "REPAIR" ? "ค่าซ่อม" : "ค่าตรวจเช็ค"}</span></div>
              <dl className="kv card-pad"><dt>ยอดชำระ</dt><dd className="strong mono">{formatTHB(job.payment.amount)}</dd><dt>วิธีชำระ</dt><dd>{METHOD_LABEL[job.payment.method]}</dd>{job.payment.reference && <><dt>อ้างอิง</dt><dd>{job.payment.reference}</dd></>}<dt>วันที่</dt><dd>{fmtDate(job.payment.paidAt)}</dd><dt>ผู้รับเงิน</dt><dd>{job.payment.receivedBy}</dd></dl></div>
          )}

          <div className="card">
            <div className="card-head"><h3><History className="icon-lg" aria-hidden />ประวัติการดำเนินการ (Audit)</h3><span className="small muted">{events.length}</span></div>
            <ol className="timeline card-pad">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="tl"><span className="pt">{e.actorType === "CUSTOMER" ? <Link2 className="icon" /> : <Clock className="icon" />}</span>
                  <div><div className="small strong">{AUDIT_LABEL[e.action] ?? e.action}{(e.after as { onBehalfOfCustomer?: boolean } | undefined)?.onBehalfOfCustomer && <span className="tag" style={{ marginLeft: 6 }}>แทนลูกค้า</span>}</div>
                    <div className="xs muted">{e.actorLabel} · {fmtDate(e.at)}</div>
                    {(e.before || e.after) && <details><summary>ดูรายละเอียด</summary><div className="json">{JSON.stringify({ before: e.before, after: e.after }, null, 2)}</div></details>}</div></li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {dlg === "quote" && <QuoteDialog job={job} onClose={() => setDlg(null)} onSubmit={(q) => { const r = s.perform(job.id, "SUBMIT_QUOTE", q as never); done(r, "ส่งใบเสนอราคาให้ลูกค้าแล้ว"); return r; }} />}
      {dlg === "complete" && <CompleteDialog job={job} onClose={() => setDlg(null)} onSubmit={(p) => { const r = s.perform(job.id, "COMPLETE", p); done(r, "รับชำระเงินและปิดงานเรียบร้อย"); if (r.ok) go(`/jobs/${job.id}`); return r; }} />}
      {dlg === "cancel" && <CancelDialog job={job} onClose={() => setDlg(null)} onSubmit={(p) => { const r = s.perform(job.id, "CANCEL", p); done(r, "ยกเลิกงานเรียบร้อย"); return r; }} />}
    </div>
  );
}
