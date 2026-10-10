import { Wrench, ShieldCheck, History, ClipboardCheck } from "lucide-react";
import { LoginForm } from "./login-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="login">
      <section className="login-hero">
        <div className="brand">
          <Wrench /> RepairDesk
        </div>
        <div>
          <h1>
            ระบบรับงานซ่อม
            <br />
            ทุกขั้นตอน ตรวจสอบย้อนหลังได้
          </h1>
          <div className="stack" style={{ marginTop: 32 }}>
            <p>
              <ClipboardCheck /> รับงาน → ตรวจสอบ → เสนอราคา → อนุมัติ → ซ่อม →
              ชำระเงิน
            </p>
            <p>
              <ShieldCheck /> สิทธิ์ตามบทบาท และลิงก์ติดตามสำหรับลูกค้า
            </p>
            <p>
              <History /> Audit Log ครบ แก้ไขไม่ได้
            </p>
          </div>
        </div>
        <p>Portfolio demo · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ</p>
      </section>
      <div className="login-form">
        <LoginForm inactive={query.inactive === "1"} />
      </div>
    </main>
  );
}
