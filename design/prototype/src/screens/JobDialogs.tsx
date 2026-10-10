import { useState } from "react";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { Banner, Dialog, Field } from "../components/ui";
import { METHOD_LABEL } from "../domain/labels";
import { computeQuoteTotals, formatTHB, parseBahtToSatang } from "../domain/money";
import type { Job, LineType, PayMethod } from "../domain/types";
import type { QuoteInput, Result } from "../store";

type Done = (r: Result) => void;
interface Line { type: LineType; description: string; qty: string; price: string }

export function QuoteDialog({ job, onClose, onSubmit }: { job: Job; onClose: () => void; onSubmit: (q: QuoteInput) => Result }) {
  const [diagnosis, setDiagnosis] = useState(job.diagnosis ?? "");
  const [lines, setLines] = useState<Line[]>([{ type: "LABOR", description: "", qty: "1", price: "" }]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const parsed = lines.map((l) => { let unit = 0; try { unit = l.price ? parseBahtToSatang(l.price) : 0; } catch { unit = NaN; } return { ...l, q: parseInt(l.qty) || 0, unit }; });
  const totals = computeQuoteTotals(parsed.map((l) => ({ qty: l.q, unitPrice: Number.isNaN(l.unit) ? 0 : l.unit })));
  const submit = () => {
    const e: Record<string, string> = {};
    if (!diagnosis.trim()) e.diagnosis = "กรุณากรอกผลการตรวจสอบ";
    parsed.forEach((l, i) => {
      if (!l.description.trim()) e[`d${i}`] = "กรุณาระบุรายการ";
      if (Number.isNaN(l.unit) || !l.price) e[`p${i}`] = "จำนวนเงินไม่ถูกต้อง";
      if (l.q < 1 || l.q > 999) e[`q${i}`] = "1–999";
    });
    setErrs(e);
    if (Object.keys(e).length) return;
    onSubmit({ diagnosis, lines: parsed.map((l) => ({ type: l.type, description: l.description, qty: l.q, unitPrice: l.unit })) });
  };
  return (
    <Dialog title="สร้างใบเสนอราคา" wide onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={submit}>ส่งใบเสนอราคาให้ลูกค้า</button></>}>
      <div className="stack">
        <p className="small muted">{job.jobNo} · {job.brand} {job.model} — ลูกค้าจะเห็นใบเสนอราคานี้ทันทีที่ลิงก์ติดตามงาน</p>
        <Field id="dg" label="ผลการตรวจสอบ" required error={errs.diagnosis}>
          <textarea id="dg" className="textarea" value={diagnosis} aria-invalid={!!errs.diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="สรุปอาการที่พบและสาเหตุ" />
        </Field>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>รายการค่าซ่อม</div>
          <div className="stack-sm">
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px 120px 36px", gap: 8, alignItems: "start" }}>
                <select aria-label="ประเภท" className="select" value={l.type} onChange={(e) => set(i, { type: e.target.value as LineType })}><option value="LABOR">ค่าแรง</option><option value="PART">อะไหล่</option></select>
                <div><input aria-label="รายการ" className="input" placeholder="เช่น เปลี่ยนหน้าจอ" value={l.description} aria-invalid={!!errs[`d${i}`]} onChange={(e) => set(i, { description: e.target.value })} />{errs[`d${i}`] && <div className="err">{errs[`d${i}`]}</div>}</div>
                <div><input aria-label="จำนวน" className="input mono" inputMode="numeric" value={l.qty} aria-invalid={!!errs[`q${i}`]} onChange={(e) => set(i, { qty: e.target.value })} /></div>
                <div><input aria-label="ราคาต่อหน่วย (บาท)" className="input mono" inputMode="decimal" placeholder="0.00" value={l.price} aria-invalid={!!errs[`p${i}`]} onChange={(e) => set(i, { price: e.target.value })} />{errs[`p${i}`] && <div className="err">{errs[`p${i}`]}</div>}</div>
                <button className="iconbtn" aria-label="ลบรายการ" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><Trash2 className="icon" /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setLines((ls) => [...ls, { type: "PART", description: "", qty: "1", price: "" }])}><Plus className="icon" />เพิ่มรายการ</button>
        </div>
        <div className="totals mono" style={{ background: "var(--slate-50)", borderRadius: 8 }} aria-live="polite">
          <div><span className="muted">รวมก่อน VAT</span><span>{formatTHB(totals.subtotal)}</span></div>
          <div><span className="muted">VAT 7%</span><span>{formatTHB(totals.vat)}</span></div>
          <div className="grand"><span>ยอดสุทธิ</span><span>{formatTHB(totals.total)}</span></div>
        </div>
      </div>
    </Dialog>
  );
}

export function CompleteDialog({ job, onClose, onSubmit }: { job: Job; onClose: () => void; onSubmit: (p: { method: PayMethod; reference: string }) => Result }) {
  const q = job.quotes.at(-1)!;
  const [method, setMethod] = useState<PayMethod>("CASH");
  const [reference, setRef] = useState("");
  const hasSlip = job.attachments.some((a) => a.stage === "PAYMENT_SLIP");
  const blocked = method === "TRANSFER" && !hasSlip;
  return (
    <Dialog title="รับชำระเงินและปิดงาน" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" disabled={blocked} onClick={() => onSubmit({ method, reference })}>ยืนยันรับชำระ {formatTHB(q.total)}</button></>}>
      <div className="stack">
        <div className="card card-pad" style={{ background: "var(--slate-50)" }}>
          <div className="small muted">ยอดที่ต้องชำระ (ตามใบเสนอราคา v{q.version} ที่อนุมัติ)</div>
          <div style={{ fontSize: 30, fontWeight: 700 }} className="mono">{formatTHB(q.total)}</div>
        </div>
        <div className="field"><span className="label" id="m">วิธีชำระเงิน</span>
          <div className="seg" role="group" aria-labelledby="m">{(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => <button key={m} aria-pressed={method === m} onClick={() => setMethod(m)}>{METHOD_LABEL[m]}</button>)}</div></div>
        <Field id="ref" label="เลขอ้างอิง (ถ้ามี)" help="เช่น เลขที่รายการโอน / สลิปบัตร"><input id="ref" className="input" value={reference} onChange={(e) => setRef(e.target.value)} /></Field>
        {blocked && <Banner kind="warn" title="ต้องแนบสลิปการโอนก่อน">กลับไปที่หัวข้อ “ไฟล์แนบ” เลือกประเภท “สลิปชำระเงิน” แล้วอัปโหลด จากนั้นกลับมายืนยันอีกครั้ง</Banner>}
      </div>
    </Dialog>
  );
}

export function CancelDialog({ job, onClose, onSubmit }: { job: Job; onClose: () => void; onSubmit: (p: { reason: string; feeSatang: number; method?: PayMethod }) => Result }) {
  const [reason, setReason] = useState(job.quotes.at(-1)?.status === "REJECTED" ? "ลูกค้าไม่อนุมัติใบเสนอราคา" : "");
  const [fee, setFee] = useState("0");
  const [method, setMethod] = useState<PayMethod | "">("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  let feeSatang = 0; let feeBad = false;
  try { feeSatang = parseBahtToSatang(fee || "0"); } catch { feeBad = true; }
  const go = () => {
    const e: Record<string, string> = {};
    if (!reason.trim()) e.reason = "กรุณาระบุเหตุผลการยกเลิก";
    if (feeBad) e.fee = "จำนวนเงินไม่ถูกต้อง";
    if (!feeBad && feeSatang > 0 && !method) e.method = "กรุณาเลือกวิธีรับชำระค่าตรวจเช็ค";
    setErrs(e);
    if (!Object.keys(e).length) onSubmit({ reason, feeSatang, method: method || undefined });
  };
  return (
    <Dialog title={`ยกเลิกงาน ${job.jobNo}`} onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>ไม่ยกเลิก</button><button className="btn btn-danger" onClick={go}>ยืนยันยกเลิกงาน</button></>}>
      <div className="stack">
        <Banner kind="warn" title="การยกเลิกไม่สามารถย้อนกลับได้">งานจะถูกปิดและไม่สามารถแนบไฟล์หรือดำเนินการต่อได้ ประวัติทั้งหมดยังคงอยู่ใน Audit Log</Banner>
        <Field id="rs" label="เหตุผลการยกเลิก" required error={errs.reason}><textarea id="rs" className="textarea" value={reason} aria-invalid={!!errs.reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="grid-2">
          <Field id="fee" label="ค่าตรวจเช็ค (บาท)" help="ใส่ 0 หากไม่เรียกเก็บ" error={errs.fee}><input id="fee" className="input mono" inputMode="decimal" value={fee} aria-invalid={!!errs.fee} onChange={(e) => setFee(e.target.value)} /></Field>
          {!feeBad && feeSatang > 0 && (
            <Field id="fm" label="วิธีรับชำระ" required error={errs.method}>
              <select id="fm" className="select" value={method} aria-invalid={!!errs.method} onChange={(e) => setMethod(e.target.value as PayMethod)}><option value="">เลือกวิธีชำระ</option>{(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
            </Field>
          )}
        </div>
        {!feeBad && feeSatang > 0 && <p className="small muted"><CircleAlert className="icon" style={{ verticalAlign: "-3px" }} /> ระบบจะบันทึกการรับชำระประเภท “ค่าตรวจเช็ค” {formatTHB(feeSatang)} พร้อมการยกเลิกในขั้นตอนเดียว</p>}
      </div>
    </Dialog>
  );
}
export type { Done };
