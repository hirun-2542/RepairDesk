import { useState } from "react";
import { ClipboardCheck, FileClock, History, LogIn, ShieldCheck, Wrench } from "lucide-react";
import { Banner, Field } from "../components/ui";
import { DEMO_LOGINS } from "../data/mock";
import { go } from "../lib/router";
import { useStore } from "../store";

export function Login({ inactive, error }: { inactive?: boolean; error?: boolean }) {
  const s = useStore();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(error ?? false); const [busy, setBusy] = useState(false);
  const attempt = (e: string, p: string) => {
    setBusy(true);
    setTimeout(() => {
      const u = s.users.find((x) => x.email === e && x.active);
      if (u && p === "demo1234") { s.login(u.id); go("/jobs"); } else { setErr(true); }
      setBusy(false);
    }, 450);
  };
  return (
    <div className="login">
      <section className="login-hero" aria-hidden="true">
        <div className="brand"><span className="brand-mark"><Wrench className="icon-lg" /></span>RepairDesk</div>
        <div>
          <h1>ระบบรับงานซ่อม<br />ทุกขั้นตอน ตรวจสอบย้อนหลังได้</h1>
          <div className="hero-points">
            {[[ClipboardCheck, "Workflow ชัดเจน", "รับงาน → ตรวจสอบ → เสนอราคา → อนุมัติ → ซ่อม → ชำระเงิน"], [ShieldCheck, "สิทธิ์ตามบทบาท", "แอดมิน หน้าร้าน ช่าง เห็นและทำได้เฉพาะส่วนของตน"], [FileClock, "ลูกค้าอนุมัติราคาผ่านลิงก์", "ไม่ต้องสมัครสมาชิก ติดตามสถานะได้ทันที"], [History, "Audit Log ครบ แก้ไขไม่ได้", "ทุกการเปลี่ยนแปลงมีผู้ทำ เวลา และค่าก่อน-หลัง"]].map(([I, t, d]) => {
              const Ico = I as typeof Wrench; return <div key={t as string}><span className="catico"><Ico className="icon" /></span><div><div className="strong" style={{ color: "#fff" }}>{t as string}</div><div className="small">{d as string}</div></div></div>;
            })}
          </div>
        </div>
        <div className="small">Portfolio demo · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ</div>
      </section>
      <main className="login-form">
        <div className="login-card stack">
          <div><h1>เข้าสู่ระบบ</h1><p className="muted small">สำหรับพนักงานร้านเท่านั้น</p></div>
          {inactive && <Banner kind="warn" title="บัญชีของคุณถูกปิดใช้งาน">กรุณาติดต่อผู้ดูแลระบบ</Banner>}
          {err && <Banner kind="error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</Banner>}
          <form className="stack" onSubmit={(e) => { e.preventDefault(); attempt(email, pw); }} noValidate>
            <Field id="email" label="อีเมล" required><input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@shop.com" aria-invalid={err} /></Field>
            <Field id="pw" label="รหัสผ่าน" required><input id="pw" className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={err} /></Field>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy} type="submit">{busy ? <span className="spin" style={{ width: 16, height: 16, border: "2px solid #fff6", borderTopColor: "#fff", borderRadius: "50%" }} /> : <LogIn className="icon" />}{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
          </form>
          <div className="stack-sm" style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div className="small strong">เข้าสู่ระบบแบบ Demo</div>
            <div className="grid-2">{DEMO_LOGINS.map((d) => <button key={d.key} className="btn btn-secondary" onClick={() => { const u = s.users.find((x) => x.id === d.userId)!; attempt(u.email, "demo1234"); }}>{d.label}</button>)}</div>
            <div className="xs muted">รหัสผ่าน demo ทุกบัญชี: demo1234</div>
          </div>
        </div>
      </main>
    </div>
  );
}
