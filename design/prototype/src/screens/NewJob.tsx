import { useState } from "react";
import { CircleAlert, Info, Save } from "lucide-react";
import { Banner, Field } from "../components/ui";
import { CATEGORIES } from "../data/mock";
import { CATEGORY_LABEL, IDENTIFIER_LABEL } from "../domain/labels";
import type { Category } from "../domain/types";
import { go, Link } from "../lib/router";
import { useStore } from "../store";

export function NewJob({ prefill }: { prefill?: boolean }) {
  const s = useStore();
  const [f, setF] = useState({ phone: prefill ? "081-234" : "", name: "", category: "PHONE" as Category, brand: "", model: "", identifier: "", symptom: "", accessories: "", technicianId: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const known = s.jobs.find((j) => j.customer.phone.replace(/\D/g, "") === f.phone.replace(/\D/g, "") && f.phone.replace(/\D/g, "").length >= 9)?.customer;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^0\d{8,9}$/.test(f.phone.replace(/\D/g, ""))) er.phone = "กรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)";
    if (!known && !f.name.trim()) er.name = "กรุณากรอกชื่อลูกค้า";
    if (!f.brand.trim()) er.brand = "กรุณากรอกยี่ห้อ";
    if (!f.model.trim()) er.model = "กรุณากรอกรุ่น";
    if (!f.symptom.trim()) er.symptom = "กรุณาอธิบายอาการเสีย";
    setErrs(er);
    if (Object.keys(er).length) { document.getElementById("form-summary")?.focus(); return; }
    const id = s.createJob({ ...f, name: known?.name ?? f.name });
    s.toast("success", "บันทึกใบรับงานเรียบร้อย — แนบรูปรับเครื่องได้ที่หน้านี้");
    go(`/jobs/${id}`);
  };
  const n = Object.keys(errs).length;
  return (
    <div className="page">
      <div className="page-head"><div><div className="crumbs"><Link to="/jobs">กระดานงาน</Link> / รับงานใหม่</div><h1>รับงานใหม่</h1></div></div>
      <div className="detail" style={{ "--side": "340px" } as React.CSSProperties}>
        <form className="card" onSubmit={submit} noValidate>
          <div className="card-pad stack">
            {n > 0 && <div id="form-summary" tabIndex={-1}><Banner kind="error" title={`กรอกข้อมูลไม่ครบ ${n} รายการ`}>ตรวจสอบช่องที่มีเครื่องหมายแจ้งเตือนด้านล่าง</Banner></div>}
            <h2>ข้อมูลลูกค้า</h2>
            <div className="grid-2">
              <Field id="phone" label="เบอร์โทรศัพท์" required error={errs.phone} help="ใช้เบอร์โทรเป็นตัวระบุลูกค้า หากมีในระบบจะใช้ข้อมูลเดิม"><input id="phone" className="input mono" inputMode="tel" value={f.phone} aria-invalid={!!errs.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="08x-xxx-xxxx" /></Field>
              <Field id="name" label="ชื่อลูกค้า" required={!known} error={errs.name}><input id="name" className="input" value={known?.name ?? f.name} disabled={!!known} aria-invalid={!!errs.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            </div>
            {known && <Banner kind="info" title="พบลูกค้าเดิมในระบบ">ใช้ข้อมูลของ “{known.name}” — จะไม่แก้ไขชื่อลูกค้าเดิม</Banner>}
            <h2 style={{ marginTop: 8 }}>อุปกรณ์ที่นำมาซ่อม</h2>
            <div className="field"><span className="label" id="cat">ประเภท</span>
              <div className="seg" role="group" aria-labelledby="cat" style={{ alignSelf: "flex-start" }}>{CATEGORIES.map((c) => <button type="button" key={c} aria-pressed={f.category === c} onClick={() => set({ category: c })}>{CATEGORY_LABEL[c]}</button>)}</div></div>
            <div className="grid-3">
              <Field id="brand" label="ยี่ห้อ" required error={errs.brand}><input id="brand" className="input" value={f.brand} aria-invalid={!!errs.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
              <Field id="model" label="รุ่น" required error={errs.model}><input id="model" className="input" value={f.model} aria-invalid={!!errs.model} onChange={(e) => set({ model: e.target.value })} /></Field>
              <Field id="ident" label={IDENTIFIER_LABEL[f.category]}><input id="ident" className="input mono" value={f.identifier} onChange={(e) => set({ identifier: e.target.value })} /></Field>
            </div>
            <Field id="symptom" label="อาการเสีย" required error={errs.symptom}><textarea id="symptom" className="textarea" value={f.symptom} aria-invalid={!!errs.symptom} onChange={(e) => set({ symptom: e.target.value })} placeholder="อธิบายอาการตามที่ลูกค้าแจ้ง" /></Field>
            <Field id="acc" label="อุปกรณ์/สภาพที่มาด้วย" help="เช่น เคส สายชาร์จ รอยบุบ"><input id="acc" className="input" value={f.accessories} onChange={(e) => set({ accessories: e.target.value })} /></Field>
            <Field id="tech" label="มอบหมายช่าง (ไม่บังคับ)" help="มอบหมายภายหลังได้ที่หน้ารายละเอียดงาน"><select id="tech" className="select" value={f.technicianId} onChange={(e) => set({ technicianId: e.target.value })}><option value="">— ยังไม่มอบหมาย —</option>{s.users.filter((u) => u.role === "TECHNICIAN" && u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          </div>
          <div className="dialog-foot" style={{ borderRadius: "0 0 12px 12px" }}><Link to="/jobs" className="btn btn-secondary">ยกเลิก</Link><button className="btn btn-primary btn-lg" type="submit"><Save className="icon" />บันทึกใบรับงาน</button></div>
        </form>
        <aside className="card card-pad stack-sm">
          <h3 className="row"><Info className="icon-lg" aria-hidden />หลังบันทึก</h3>
          <ol className="small stack-sm" style={{ paddingLeft: 20, margin: 0 }}><li>ระบบออกเลขที่งาน RJ-ปี-ลำดับ</li><li>แนบรูปสภาพเครื่องตอนรับ (ขั้นตอน “รับเครื่อง”)</li><li>พิมพ์ใบรับงานพร้อมลิงก์ติดตามให้ลูกค้า</li><li>มอบหมายช่างเพื่อเริ่มตรวจสอบ</li></ol>
          <div className="xs muted row" style={{ alignItems: "flex-start" }}><CircleAlert className="icon" aria-hidden />ทุกการบันทึกถูกเก็บใน Audit Log</div>
        </aside>
      </div>
    </div>
  );
}
