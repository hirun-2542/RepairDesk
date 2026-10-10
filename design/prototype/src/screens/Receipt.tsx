import { Printer } from "lucide-react";
import { CATEGORY_LABEL, IDENTIFIER_LABEL, METHOD_LABEL } from "../domain/labels";
import { computeQuoteTotals, formatTHB } from "../domain/money";
import { canViewJob } from "../domain/workflow";
import { fmtDate } from "../lib/format";
import { Link } from "../lib/router";
import { useStore } from "../store";
import { NotFound } from "./Misc";

export function Receipt({ id }: { id: string }) {
  const { jobs, me } = useStore();
  const job = jobs.find((j) => j.id === id);
  if (!job || !me || !canViewJob(me, job)) return <NotFound />;
  const quote = job.quotes.filter((q) => q.status === "APPROVED").at(-1);
  const p = job.payment;
  const feeTotals = p?.kind === "INSPECTION_FEE" ? computeQuoteTotals([{ qty: 1, unitPrice: Math.round(p.amount / 1.07) }]) : null;
  return (
    <div className="page">
      <div className="page-head no-print"><div><div className="crumbs"><Link to={`/jobs/${job.id}`}>{job.jobNo}</Link> / พิมพ์เอกสาร</div><h1>ใบรับงาน / ใบเสร็จรับเงิน</h1></div><button className="btn btn-primary btn-lg" onClick={() => window.print()}><Printer className="icon" />พิมพ์</button></div>
      <article className="paper stack">
        <header className="row between" style={{ alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>Demo Repair Shop</div><div className="small muted">123 ถนนตัวอย่าง กรุงเทพฯ 10110 · โทร 02-000-0000</div></div>
          <div className="right"><div className="small muted">ใบรับงาน</div><div className="strong mono" style={{ fontSize: 20 }}>{job.jobNo}</div><div className="small muted">{fmtDate(job.createdAt)}</div></div>
        </header>
        <hr />
        <section className="grid-2">
          <dl className="kv" style={{ gridTemplateColumns: "90px 1fr" }}><dt>ลูกค้า</dt><dd>{job.customer.name}</dd><dt>โทรศัพท์</dt><dd>{job.customer.phone}</dd></dl>
          <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}><dt>อุปกรณ์</dt><dd>{CATEGORY_LABEL[job.category]} {job.brand} {job.model}</dd>{job.identifier && <><dt>{IDENTIFIER_LABEL[job.category]}</dt><dd className="mono">{job.identifier}</dd></>}</dl>
        </section>
        <dl className="kv" style={{ gridTemplateColumns: "90px 1fr" }}><dt>อาการ</dt><dd>{job.symptom}</dd>{job.accessories && <><dt>อุปกรณ์มาด้วย</dt><dd>{job.accessories}</dd></>}</dl>
        <div className="card card-pad small" style={{ background: "var(--slate-50)", boxShadow: "none" }}>ติดตามสถานะงานได้ที่ลิงก์ส่วนตัว: <span className="mono">repairdesk.example/track/{job.token}</span></div>
        {p && (<>
          <hr />
          <div className="row between"><h2>ใบเสร็จรับเงิน</h2><span className="small muted">ชำระเมื่อ {fmtDate(p.paidAt)}</span></div>
          <table><thead><tr><th>รายการ</th><th className="right">จำนวน</th><th className="right">ราคา/หน่วย</th><th className="right">รวม</th></tr></thead><tbody>
            {p.kind === "REPAIR" && quote ? quote.lines.map((l, i) => <tr key={i}><td>{l.description}</td><td className="right mono">{l.qty}</td><td className="right mono">{formatTHB(l.unitPrice)}</td><td className="right mono">{formatTHB(l.qty * l.unitPrice)}</td></tr>)
              : <tr><td>ค่าตรวจเช็ค</td><td className="right mono">1</td><td className="right mono">{formatTHB(feeTotals!.subtotal)}</td><td className="right mono">{formatTHB(feeTotals!.subtotal)}</td></tr>}
          </tbody></table>
          <div className="totals mono" style={{ padding: 0 }}>
            <div><span className="muted">รวมก่อน VAT</span><span>{formatTHB(p.kind === "REPAIR" && quote ? quote.subtotal : feeTotals!.subtotal)}</span></div>
            <div><span className="muted">VAT 7%</span><span>{formatTHB(p.kind === "REPAIR" && quote ? quote.vat : p.amount - feeTotals!.subtotal)}</span></div>
            <div className="grand"><span>ยอดชำระ</span><span>{formatTHB(p.amount)}</span></div>
          </div>
          <div className="small muted">ชำระโดย {METHOD_LABEL[p.method]}{p.reference && ` · อ้างอิง ${p.reference}`} · ผู้รับเงิน {p.receivedBy}</div>
        </>)}
        <footer className="small muted" style={{ textAlign: "center", marginTop: 24 }}>ขอบคุณที่ใช้บริการ · เอกสารนี้ออกโดยระบบ RepairDesk</footer>
      </article>
    </div>
  );
}
