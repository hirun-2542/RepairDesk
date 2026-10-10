import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
import { CategoryIcon, EmptyState, SkeletonRows, StatusBadge } from "../components/ui";
import { CATEGORIES } from "../data/mock";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from "../domain/labels";
import type { Category, JobStatus } from "../domain/types";
import { ago } from "../lib/format";
import { go } from "../lib/router";
import { useStore } from "../store";

const PAGE = 8;
export function List({ initialQ = "", loading }: { initialQ?: string; loading?: boolean }) {
  const { jobs, me, users } = useStore();
  const [q, setQ] = useState(initialQ); const [st, setSt] = useState<JobStatus | "">(""); const [cat, setCat] = useState<Category | "">(""); const [tech, setTech] = useState(""); const [page, setPage] = useState(1);
  if (!me) return null;
  const rows = jobs.filter((j) => (me.role !== "TECHNICIAN" || j.technicianId === me.id) && (!st || j.status === st) && (!cat || j.category === cat) && (!tech || j.technicianId === tech)
    && (!q || [j.jobNo, j.customer.name, j.customer.phone, j.brand, j.model].some((x) => x.toLowerCase().includes(q.toLowerCase()))));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages);
  const reset = () => { setQ(""); setSt(""); setCat(""); setTech(""); setPage(1); };
  return (
    <div className="page">
      <div className="page-head"><div><h1>รายการงาน</h1><p className="muted small">ค้นหาและกรองงานทั้งหมด</p></div></div>
      <div className="card">
        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="field"><label htmlFor="q">ค้นหา</label><div style={{ position: "relative" }}><Search className="icon" style={{ position: "absolute", left: 12, top: 13, color: "var(--slate-500)" }} aria-hidden /><input id="q" className="input" style={{ paddingLeft: 36 }} placeholder="เลขที่งาน, ชื่อลูกค้า, เบอร์โทร, ยี่ห้อ, รุ่น" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div></div>
          <div className="field"><label htmlFor="fs">สถานะ</label><select id="fs" className="select" value={st} onChange={(e) => { setSt(e.target.value as JobStatus); setPage(1); }}><option value="">ทั้งหมด</option>{STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
          <div className="field"><label htmlFor="fc">ประเภท</label><select id="fc" className="select" value={cat} onChange={(e) => { setCat(e.target.value as Category); setPage(1); }}><option value="">ทั้งหมด</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></div>
          <div className="field"><label htmlFor="ft">ช่าง</label><select id="ft" className="select" value={tech} disabled={me.role === "TECHNICIAN"} onChange={(e) => { setTech(e.target.value); setPage(1); }}><option value="">ทั้งหมด</option>{users.filter((u) => u.role === "TECHNICIAN").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <button type="button" className="btn btn-ghost" onClick={reset}>ล้างตัวกรอง</button>
        </form>
        {loading ? <SkeletonRows n={7} /> : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="ไม่พบงานที่ตรงกับเงื่อนไข" action={<button className="btn btn-secondary" onClick={reset}>ล้างตัวกรอง</button>}>ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูงานทั้งหมด</EmptyState>
        ) : (
          <div className="tablewrap"><table>
            <caption className="sr-only">รายการงานซ่อม</caption>
            <thead><tr><th>เลขที่งาน</th><th>ลูกค้า</th><th>อุปกรณ์</th><th>สถานะ</th><th>ช่าง</th><th>อัปเดต</th></tr></thead>
            <tbody>{rows.slice((cur - 1) * PAGE, cur * PAGE).map((j) => (
              <tr key={j.id} style={{ cursor: "pointer" }} onClick={() => go(`/jobs/${j.id}`)}>
                <td><a href={`#/jobs/${j.id}`} className="strong mono">{j.jobNo}</a></td>
                <td><div>{j.customer.name}</div><div className="xs muted">{j.customer.phone}</div></td>
                <td><div className="row" style={{ gap: 8 }}><CategoryIcon c={j.category} /><div><div>{j.brand} {j.model}</div><div className="xs muted">{CATEGORY_LABEL[j.category]}</div></div></div></td>
                <td><StatusBadge status={j.status} /></td>
                <td>{users.find((u) => u.id === j.technicianId)?.name ?? <span className="muted">—</span>}</td>
                <td className="muted">{ago(j.updatedAt)}</td>
              </tr>))}</tbody></table></div>
        )}
        <div className="pager"><span>แสดง {rows.length === 0 ? 0 : (cur - 1) * PAGE + 1}–{Math.min(cur * PAGE, rows.length)} จาก {rows.length} งาน</span>
          <div className="row"><button className="btn btn-secondary btn-sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft className="icon" />ก่อนหน้า</button><span>หน้า {cur}/{pages}</span><button className="btn btn-secondary btn-sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>ถัดไป<ChevronRight className="icon" /></button></div></div>
      </div>
    </div>
  );
}
