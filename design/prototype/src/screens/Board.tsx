import { Plus, SearchX } from "lucide-react";
import { CategoryIcon, STATUS_ICON, SkeletonRows } from "../components/ui";
import { STATUS_LABEL, STATUS_ORDER } from "../domain/labels";
import { ago } from "../lib/format";
import { Link } from "../lib/router";
import { useStore } from "../store";

export function Board({ loading }: { loading?: boolean }) {
  const { jobs, me, users } = useStore();
  if (!me) return null;
  const mine = jobs.filter((j) => me.role !== "TECHNICIAN" || j.technicianId === me.id);
  const open = mine.filter((j) => !["COMPLETED", "CANCELLED"].includes(j.status));
  const stat = [["งานค้างทั้งหมด", open.length, "RECEIVED"], ["รอลูกค้าอนุมัติราคา", mine.filter((j) => j.status === "QUOTED").length, "QUOTED"], ["กำลังซ่อม", mine.filter((j) => j.status === "REPAIRING").length, "REPAIRING"], ["รอชำระ/รับเครื่อง", mine.filter((j) => j.status === "READY_FOR_PICKUP").length, "READY_FOR_PICKUP"]] as const;
  return (
    <div className="page page-wide">
      <div className="page-head">
        <div><h1>กระดานงาน</h1><p className="muted small">{me.role === "TECHNICIAN" ? "เฉพาะงานที่มอบหมายให้คุณ" : "ภาพรวมงานทุกสถานะ (ดูอย่างเดียว — เปลี่ยนสถานะที่หน้ารายละเอียดงาน)"}</p></div>
        {me.role !== "TECHNICIAN" && <Link to="/jobs/new" className="btn btn-primary btn-lg"><Plus className="icon" />รับงานใหม่</Link>}
      </div>
      <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginBottom: 20 }}>
        {stat.map(([l, n, st]) => { const I = STATUS_ICON[st]; return <div key={l} className="card card-pad row"><span className={`catico st-${st}`}><I className="icon" aria-hidden /></span><div><div className="small muted">{l}</div><div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{n}</div></div></div>; })}
      </div>
      <div className="board" role="list" aria-label="กระดานงานตามสถานะ">
        {STATUS_ORDER.map((st) => {
          const I = STATUS_ICON[st]; const col = mine.filter((j) => j.status === st);
          return (
            <section key={st} className="col" role="listitem" aria-label={`${STATUS_LABEL[st]} ${col.length} งาน`}>
              <h2 className="col-head" style={{ fontSize: 14 }}><I className={`icon dot-${st}`} aria-hidden />{STATUS_LABEL[st]}<span className="col-count">{loading ? "–" : col.length}</span></h2>
              {loading ? <SkeletonRows n={3} /> : col.length === 0 ? <div className="col-empty">ไม่มีงานในสถานะนี้</div> : col.map((j) => {
                const t = users.find((u) => u.id === j.technicianId);
                return (
                  <Link key={j.id} to={`/jobs/${j.id}`} className="jobcard">
                    <div className="row between" style={{ marginBottom: 6 }}><span className="jn mono">{j.jobNo}</span><CategoryIcon c={j.category} /></div>
                    <div className="small strong">{j.brand} {j.model}</div>
                    <div className="small muted">{j.customer.name}</div>
                    <div className="meta" style={{ marginTop: 8, justifyContent: "space-between" }}><span style={{ color: t ? undefined : "var(--warning)" }}>{t ? t.name : "ยังไม่มอบหมาย"}</span><span>{ago(j.updatedAt)}</span></div>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </div>
      {mine.length === 0 && <div className="card"><div className="empty"><SearchX /><h3>ยังไม่มีงานที่มอบหมายให้คุณ</h3></div></div>}
    </div>
  );
}
