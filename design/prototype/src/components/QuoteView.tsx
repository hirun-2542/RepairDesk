import { formatTHB } from "../domain/money";
import type { Quote } from "../domain/types";
import { fmtDate } from "../lib/format";

const QS = { PENDING: ["st-QUOTED", "รออนุมัติ"], APPROVED: ["st-COMPLETED", "อนุมัติแล้ว"], REJECTED: ["st-CANCELLED", "ลูกค้าปฏิเสธ"] } as const;
const TYPE = { LABOR: "ค่าแรง", PART: "อะไหล่" } as const;

/** staff: dense table. customer: stacked list that survives a 360px viewport. */
export function QuoteView({ q, latest, viewer = "staff" }: { q: Quote; latest?: boolean; viewer?: "staff" | "customer" }) {
  const [cls, label] = QS[q.status];
  const by = q.decidedBy === "CUSTOMER" || q.decidedBy === "ลูกค้า" ? "ลูกค้า" : q.decidedBy;
  return (
    <section className="quote" aria-label={`ใบเสนอราคา เวอร์ชัน ${q.version}`} style={viewer === "customer" ? { background: "#fff" } : undefined}>
      <div className="quote-head">
        <div className="row"><span className="strong">ใบเสนอราคา v{q.version}</span>{latest && <span className="tag">ล่าสุด</span>}</div>
        <span className={`badge ${cls}`}>{label}</span>
      </div>
      {viewer === "customer" ? (
        <ul className="qlines">
          {q.lines.map((l, i) => (
            <li key={i}>
              <div><div>{l.description}</div><div className="xs muted">{TYPE[l.type]} · {l.qty} × {formatTHB(l.unitPrice)}</div></div>
              <div className="mono strong">{formatTHB(l.qty * l.unitPrice)}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>รายการ</th><th>ประเภท</th><th className="right">จำนวน</th><th className="right">ราคา/หน่วย</th><th className="right">รวม</th></tr></thead>
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={i}><td>{l.description}</td><td><span className="tag">{TYPE[l.type]}</span></td>
                  <td className="right mono">{l.qty}</td><td className="right mono">{formatTHB(l.unitPrice)}</td><td className="right mono">{formatTHB(l.qty * l.unitPrice)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="totals mono">
        <div><span className="muted">รวมก่อน VAT</span><span>{formatTHB(q.subtotal)}</span></div>
        <div><span className="muted">VAT 7%</span><span>{formatTHB(q.vat)}</span></div>
        <div className="grand"><span>ยอดสุทธิ</span><span>{formatTHB(q.total)}</span></div>
      </div>
      {q.decidedAt && viewer === "staff" && <div className="small muted" style={{ padding: "0 16px 12px" }}>ตัดสินใจโดย {by} · {fmtDate(q.decidedAt)}</div>}
    </section>
  );
}
