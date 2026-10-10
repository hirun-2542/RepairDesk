import { useState } from "react";
import { ChevronDown, Search, SearchX, UserPlus } from "lucide-react";
import { Banner, EmptyState, Field } from "../components/ui";
import { AUDIT_LABEL, ROLE_LABEL } from "../domain/labels";
import type { Role } from "../domain/types";
import { fmtDate } from "../lib/format";
import { useStore } from "../store";

export function Users() {
  const s = useStore();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "TECHNICIAN" as Role });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = "กรุณากรอกชื่อ";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = "อีเมลไม่ถูกต้อง";
    if (f.password.length < 8) er.password = "รหัสผ่านอย่างน้อย 8 ตัวอักษร";
    setErrs(er);
    if (Object.keys(er).length) return;
    const r = s.createUser(f);
    if (r.ok) { s.toast("success", "สร้างผู้ใช้เรียบร้อย"); setF({ name: "", email: "", password: "", role: "TECHNICIAN" }); } else setErrs({ email: (r as { error: string }).error });
  };
  return (
    <div className="page">
      <div className="page-head"><div><h1>จัดการผู้ใช้</h1><p className="muted small">สร้างบัญชีพนักงาน เปลี่ยนบทบาท และปิดใช้งาน (มีผลทันทีในคำขอถัดไป)</p></div></div>
      <div className="detail" style={{ "--side": "360px" } as React.CSSProperties}>
        <div className="card"><div className="tablewrap"><table>
          <caption className="sr-only">รายชื่อผู้ใช้</caption>
          <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th></tr></thead>
          <tbody>{s.users.map((u) => { const self = u.id === s.me?.id; return (
            <tr key={u.id} style={u.active ? undefined : { opacity: .65 }}>
              <td className="strong">{u.name}{self && <span className="tag" style={{ marginLeft: 8 }}>คุณ</span>}</td><td className="muted">{u.email}</td>
              <td><label className="sr-only" htmlFor={`r${u.id}`}>บทบาทของ {u.name}</label><select id={`r${u.id}`} className="select" style={{ minHeight: 36, width: 150 }} value={u.role} disabled={self} onChange={(e) => { const r = s.updateUser(u.id, { role: e.target.value as Role }); s.toast(r.ok ? "success" : "error", r.ok ? "เปลี่ยนบทบาทเรียบร้อย" : (r as { error: string }).error); }}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
              <td><div className="row"><button role="switch" aria-checked={u.active} aria-label={`เปิดใช้งาน ${u.name}`} disabled={self} onClick={() => { const r = s.updateUser(u.id, { active: !u.active }); s.toast(r.ok ? "success" : "error", r.ok ? (u.active ? "ปิดใช้งานผู้ใช้แล้ว" : "เปิดใช้งานผู้ใช้แล้ว") : (r as { error: string }).error); }} style={{ width: 44, height: 24, borderRadius: 12, border: 0, background: u.active ? "var(--accent)" : "var(--slate-300)", position: "relative", opacity: self ? .4 : 1 }}><i style={{ position: "absolute", top: 3, left: u.active ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .15s" }} /></button><span className="small">{u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span></div></td>
            </tr>); })}</tbody></table></div>
          <div className="pager"><span>บัญชีของคุณแก้ไขเองไม่ได้ เพื่อป้องกันการล็อกตัวเองออกจากระบบ</span></div></div>
        <form className="card card-pad stack" onSubmit={create} noValidate>
          <h2 className="row"><UserPlus className="icon-lg" aria-hidden />สร้างผู้ใช้ใหม่</h2>
          <Field id="un" label="ชื่อ" required error={errs.name}><input id="un" className="input" value={f.name} aria-invalid={!!errs.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field id="ue" label="อีเมล" required error={errs.email}><input id="ue" className="input" type="email" value={f.email} aria-invalid={!!errs.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field id="up" label="รหัสผ่าน" required error={errs.password} help="อย่างน้อย 8 ตัวอักษร"><input id="up" className="input" type="password" autoComplete="new-password" value={f.password} aria-invalid={!!errs.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field id="ur" label="บทบาท"><select id="ur" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <button className="btn btn-primary btn-block" type="submit">สร้างผู้ใช้</button>
        </form>
      </div>
    </div>
  );
}

export function Audit({ initialAction = "" }: { initialAction?: string }) {
  const { audit, jobs } = useStore();
  const [action, setAction] = useState(initialAction); const [actor, setActor] = useState(""); const [jobNo, setJobNo] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [page, setPage] = useState(1);
  const jid = jobNo ? jobs.find((j) => j.jobNo.toLowerCase().includes(jobNo.toLowerCase()))?.id ?? "__none" : "";
  const rows = [...audit].reverse().filter((e) => (!action || e.action === action) && (!actor || e.actorLabel.includes(actor)) && (!jid || e.jobId === jid) && (!from || e.at.slice(0, 10) >= from) && (!to || e.at.slice(0, 10) <= to));
  const PAGE = 12; const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const cur = Math.min(page, pages);
  const jobNoOf = (id?: string) => jobs.find((j) => j.id === id)?.jobNo;
  return (
    <div className="page">
      <div className="page-head"><div><h1>Audit Log</h1><p className="muted small">บันทึกทุกการเปลี่ยนแปลง — เพิ่มได้อย่างเดียว แก้ไขหรือลบไม่ได้ (บังคับที่ฐานข้อมูล)</p></div></div>
      <div className="card">
        <form className="filters filters-6" role="search" onSubmit={(e) => e.preventDefault()}>
          <div className="field"><label htmlFor="aa">การกระทำ</label><select id="aa" className="select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}><option value="">ทั้งหมด</option>{Object.entries(AUDIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}</select></div>
          <div className="field"><label htmlFor="ac">ผู้ทำรายการ</label><div style={{ position: "relative" }}><Search className="icon" style={{ position: "absolute", left: 12, top: 13, color: "var(--slate-500)" }} aria-hidden /><input id="ac" className="input" style={{ paddingLeft: 36 }} value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} placeholder="ชื่อหรือบทบาท" /></div></div>
          <div className="field"><label htmlFor="aj">เลขที่งาน</label><input id="aj" className="input mono" value={jobNo} onChange={(e) => { setJobNo(e.target.value); setPage(1); }} placeholder="RJ-2026-0005" /></div>
          <div className="field"><label htmlFor="af">ตั้งแต่</label><input id="af" className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label htmlFor="at">ถึง</label><input id="at" className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button type="button" className="btn btn-ghost" onClick={() => { setAction(""); setActor(""); setJobNo(""); setFrom(""); setTo(""); }}>ล้าง</button>
        </form>
        {rows.length === 0 ? <EmptyState icon={SearchX} title="ไม่พบรายการ Audit">ลองปรับตัวกรอง</EmptyState> : (
          <div className="tablewrap"><table>
            <caption className="sr-only">Audit Log</caption>
            <thead><tr><th>เวลา</th><th>ผู้ทำรายการ</th><th>การกระทำ</th><th>งาน</th><th>รายละเอียด</th></tr></thead>
            <tbody>{rows.slice((cur - 1) * PAGE, cur * PAGE).map((e) => (
              <tr key={e.id}>
                <td className="mono muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.at)}</td>
                <td>{e.actorLabel}{e.actorType !== "USER" && <span className={`tag`} style={{ marginLeft: 6 }}>{e.actorType === "CUSTOMER" ? "ลูกค้า" : "ไม่ระบุตัวตน"}</span>}</td>
                <td><div className="strong">{AUDIT_LABEL[e.action] ?? e.action}</div><div className="xs muted mono">{e.action}</div></td>
                <td className="mono">{jobNoOf(e.jobId) ?? "—"}</td>
                <td>{e.before || e.after ? <details><summary style={{ cursor: "pointer", color: "var(--accent)" }} className="small">ก่อน/หลัง <ChevronDown className="icon" style={{ verticalAlign: "-3px" }} aria-hidden /></summary>
                  <div className="grid-2" style={{ gap: 8, marginTop: 6, minWidth: 360 }}><div><div className="xs muted">ก่อน</div><div className="json">{JSON.stringify(e.before ?? null, null, 1)}</div></div><div><div className="xs muted">หลัง</div><div className="json">{JSON.stringify(e.after ?? null, null, 1)}</div></div></div></details> : <span className="muted">—</span>}</td>
              </tr>))}</tbody></table></div>)}
        <div className="pager"><span>{rows.length} รายการ</span><div className="row"><button className="btn btn-secondary btn-sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>ก่อนหน้า</button><span>หน้า {cur}/{pages}</span><button className="btn btn-secondary btn-sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>ถัดไป</button></div></div>
      </div>
      <div style={{ marginTop: 16 }}><Banner kind="info">Audit Log เป็น append-only — ปุ่มแก้ไข/ลบไม่มีอยู่ และฐานข้อมูลปฏิเสธคำสั่ง UPDATE/DELETE</Banner></div>
    </div>
  );
}
