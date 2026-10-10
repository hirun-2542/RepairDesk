import { Ban, Check, Copy, Plus, Trash2 } from "lucide-react";
import { Banner, CATEGORY_ICON, Field, StatusBadge, STATUS_ICON } from "../components/ui";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from "../domain/labels";
import type { Category } from "../domain/types";

const S = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="card card-pad stack" style={{ marginBottom: 20 }}><h2>{title}</h2>{children}</section>;
const sw = (name: string, hex: string, note?: string) => <div className="swatch" key={name}><i style={{ background: hex, borderBottom: "1px solid var(--border)" }} /><div><div className="strong">{name}</div><div className="mono muted">{hex}</div>{note && <div className="muted">{note}</div>}</div></div>;

export function DesignSystem() {
  return (
    <div className="page pad-bottom">
      <div className="page-head"><div><h1>Design System — RepairDesk</h1><p className="muted small">Style: Accessible &amp; Professional · Navy + Blue CTA · IBM Plex Sans Thai · Lucide icons · WCAG AA</p></div></div>
      <S title="1. สี (Color tokens)">
        <div className="label">Brand &amp; Neutral</div>
        <div className="swatches">{sw("navy-900 / primary", "#0F172A", "Top bar, headings · 17.9:1")}{sw("accent / CTA", "#0369A1", "ปุ่มหลัก, ลิงก์ · 5.9:1 บนขาว")}{sw("accent-hover", "#075985", "7.6:1 กับตัวอักษรขาว")}{sw("bg", "#F8FAFC")}{sw("surface", "#FFFFFF")}{sw("border", "#E2E8F0")}{sw("fg-muted", "#475569", "ข้อความรอง · 7.6:1")}{sw("danger", "#B91C1C", "ข้อผิดพลาด · 6.5:1")}{sw("success", "#166534", "6.5:1 บนพื้นอ่อน")}{sw("warning", "#92400E", "6.4:1 บนพื้นอ่อน")}</div>
        <div className="label" style={{ marginTop: 8 }}>Status tones (พื้น + ตัวอักษร + ไอคอน — ไม่ใช้สีอย่างเดียว · ทุกคู่สีตัวอักษร/พื้น ≥ 6.3:1)</div>
        <div className="row wrap">{STATUS_ORDER.map((s) => <StatusBadge key={s} status={s} large />)}</div>
        <div className="swatches">{STATUS_ORDER.map((s) => { const k = s === "READY_FOR_PICKUP" ? "ready" : s.toLowerCase(); return <div className="swatch" key={s}><i style={{ background: `var(--st-${k}-bg)` }} /><div><div className="strong">{STATUS_LABEL[s]}</div><div className="mono muted">fg var(--st-{k}-fg)</div></div></div>; })}</div>
      </S>
      <S title="2. ตัวอักษร (Typography)">
        <p className="small muted">ฟอนต์: IBM Plex Sans Thai 400/500/600/700 (รองรับทั้งไทย/ละติน) · line-height 1.6 สำหรับสระ-วรรณยุกต์ · ตัวเลขเงินใช้ tabular-nums</p>
        <div className="stack-sm"><div style={{ fontSize: 30, fontWeight: 600 }}>2xl 30 — ระบบรับงานซ่อม</div><div style={{ fontSize: 24, fontWeight: 600 }}>xl 24 — หัวข้อหน้า (H1)</div><div style={{ fontSize: 20, fontWeight: 600 }}>lg 20 — หัวข้อการ์ด (H2)</div><div style={{ fontSize: 16 }}>md 16 — เนื้อหา ฟอร์ม ปุ่มใหญ่</div><div style={{ fontSize: 14 }}>sm 14 — ตาราง ปุ่ม ข้อความรอง</div><div style={{ fontSize: 12 }} className="muted">xs 12 — คำอธิบายช่อง วันที่ (ใช้เฉพาะข้อความรอง)</div><div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>฿ 12,345.67 · RJ-2026-0005</div></div>
      </S>
      <S title="3. ระยะห่าง รัศมี เงา (Spacing · Radius · Shadow)">
        <div className="row wrap" style={{ alignItems: "flex-end" }}>{[4, 8, 12, 16, 20, 24, 32, 48].map((n) => <div key={n} className="stack-sm" style={{ alignItems: "center", gap: 4 }}><i style={{ display: "block", width: n, height: n, background: "var(--accent)", borderRadius: 2 }} /><span className="xs mono">{n}</span></div>)}</div>
        <div className="row wrap">{[["sm 6", 6], ["md 8", 8], ["lg 12", 12], ["full", 999]].map(([l, r]) => <div key={l as string} className="card card-pad small" style={{ borderRadius: r as number, minWidth: 88, textAlign: "center" }}>{l}</div>)}{[1, 2, 3].map((n) => <div key={n} className="small" style={{ padding: "16px 24px", borderRadius: 12, background: "#fff", boxShadow: `var(--shadow-${n})` }}>shadow-{n}</div>)}</div>
      </S>
      <S title="4. ปุ่ม (Buttons) — สูงขั้นต่ำ 40px, ปุ่มหลักบนมือถือ 44px">
        <div className="row wrap"><button className="btn btn-primary"><Plus className="icon" />Primary</button><button className="btn btn-secondary"><Copy className="icon" />Secondary</button><button className="btn btn-ghost">Ghost</button><button className="btn btn-danger-outline"><Ban className="icon" />Danger outline</button><button className="btn btn-danger"><Trash2 className="icon" />Danger</button><button className="btn btn-primary" disabled>Disabled</button><button className="btn btn-primary btn-lg"><Check className="icon" />Large (44px)</button></div>
        <p className="xs muted">กฎ: 1 ปุ่ม Primary ต่อบริบท · ปุ่มทำลายล้างต้องมี dialog ยืนยัน · ปุ่มไอคอนล้วนต้องมี aria-label · focus ring 3px สีฟ้า offset 2px</p>
      </S>
      <S title="5. ฟอร์ม (Form controls)">
        <div className="grid-3"><Field id="d1" label="ปกติ" help="ข้อความช่วยเหลือ"><input id="d1" className="input" placeholder="placeholder" /></Field><Field id="d2" label="Focus"><input id="d2" className="input" style={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px rgb(3 105 161 / 25%)" }} defaultValue="กำลังพิมพ์" /></Field><Field id="d3" label="Error" error="จำนวนเงินไม่ถูกต้อง"><input id="d3" className="input" aria-invalid defaultValue="12.345" /></Field></div>
        <div className="seg" role="group" aria-label="ตัวอย่าง segmented"><button aria-pressed>เงินสด</button><button aria-pressed={false}>โอนเงิน</button><button aria-pressed={false}>บัตร</button></div>
      </S>
      <S title="6. ไอคอนและประเภทงาน (Lucide · stroke 2 · 16/20px)">
        <div className="row wrap">{STATUS_ORDER.map((s) => { const I = STATUS_ICON[s]; return <span key={s} className="row small" style={{ gap: 6 }}><I className={`icon-lg dot-${s}`} aria-hidden />{STATUS_LABEL[s]}</span>; })}</div>
        <div className="row wrap">{(Object.keys(CATEGORY_ICON) as Category[]).map((c) => { const I = CATEGORY_ICON[c]; return <span key={c} className="row small" style={{ gap: 6 }}><span className="catico"><I className="icon" aria-hidden /></span>{CATEGORY_LABEL[c]}</span>; })}</div>
      </S>
      <S title="7. ข้อความแจ้งเตือน (Banners)"><div className="grid-2"><Banner kind="info" title="ข้อมูล">ใช้แจ้งข้อมูลทั่วไป</Banner><Banner kind="ok" title="สำเร็จ">ดำเนินการเรียบร้อย</Banner><Banner kind="warn" title="คำเตือน">การกระทำนี้ย้อนกลับไม่ได้</Banner><Banner kind="error" title="ผิดพลาด">ไฟล์ใหญ่เกิน 10MB</Banner></div></S>
      <S title="8. หลักการใช้งาน (Interaction principles)">
        <ul className="small stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
          <li><b>แสดงเฉพาะปุ่มที่ role นั้นทำได้</b> — ปุ่มที่ติด guard (เช่น ซ่อมเสร็จ) แสดงแบบ disabled พร้อมเหตุผลสีแดง + ไอคอน</li>
          <li><b>สถานะ = สี + ไอคอน + ข้อความ</b> เสมอ (ผู้ใช้ตาบอดสี/screen reader ไม่พลาด)</li>
          <li><b>ลูกค้าไม่ต้องสมัครสมาชิก</b> — หน้า Tracking เป็น mobile-first, ปุ่มอนุมัติ/ปฏิเสธติดล่างจอ (sticky) ขนาด 44px</li>
          <li><b>ยืนยันการกระทำที่ย้อนไม่ได้</b> — ยกเลิกงาน, ลูกค้าปฏิเสธราคา ต้องมี dialog และบอกผลที่ตามมา</li>
          <li><b>Feedback ทุกครั้ง</b> — toast สำเร็จ/ล้มเหลว, ปุ่มแสดง spinner ระหว่างรอ, motion 150–220ms และเคารพ prefers-reduced-motion</li>
          <li><b>Responsive</b> — 390 / 1024 / 1440 / 1920 ที่ตรวจจริง; เมนูซ้าย 248px → แถบไอคอน 68px (&lt;1100px) → แถบไอคอนด้านบน (&lt;720px); ตารางเลื่อนแนวนอนในกรอบ, Kanban เลื่อนแนวนอน, หน้า detail เปลี่ยนเป็นคอลัมน์เดียวต่ำกว่า 1100px</li>
        </ul>
      </S>
    </div>
  );
}
