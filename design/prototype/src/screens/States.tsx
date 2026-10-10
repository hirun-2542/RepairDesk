import { CircleAlert, CircleCheck, Lock, SearchX, ServerCrash, WifiOff } from "lucide-react";
import { Banner, EmptyState, Field, SkeletonRows } from "../components/ui";
import { ACTION_LABEL } from "../domain/labels";

const Box = ({ title, note, children }: { title: string; note: string; children: React.ReactNode }) => (
  <div className="gal-item"><h3>{title}</h3><p className="xs muted" style={{ marginBottom: 8 }}>{note}</p><div className="gal-box">{children}</div></div>
);
export function States() {
  return (
    <div className="page pad-bottom">
      <div className="page-head"><div><h1>สถานะหน้าจอ (Screen States)</h1><p className="muted small">Empty · Loading · Error · Success · Forbidden · Disabled · Conflict — ทุกสถานะใช้ข้อความภาษาไทยที่บอกสาเหตุและทางไปต่อ</p></div></div>
      <div className="gallery">
        <Box title="1. Empty — ไม่มีผลค้นหา" note="รายการงาน · ปุ่มล้างตัวกรองเป็นทางออก"><EmptyState icon={SearchX} title="ไม่พบงานที่ตรงกับเงื่อนไข" action={<button className="btn btn-secondary">ล้างตัวกรอง</button>}>ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูงานทั้งหมด</EmptyState></Box>
        <Box title="2. Empty — คอลัมน์ Kanban" note="กระดานงาน · ไม่ต้องมีปุ่ม เพราะเป็นการแสดงผลอย่างเดียว"><div style={{ padding: 16, background: "var(--slate-100)" }}><div className="col-empty">ไม่มีงานในสถานะนี้</div></div></Box>
        <Box title="3. Loading — Skeleton" note="รายการ/ตาราง · คงโครงสร้างเพื่อไม่ให้เลย์เอาต์กระโดด (CLS)"><SkeletonRows n={6} /></Box>
        <Box title="4. Validation error" note="สรุปข้อผิดพลาดด้านบน + ข้อความใต้ช่อง + ไอคอน (ไม่ใช้สีอย่างเดียว)">
          <div className="card-pad stack"><Banner kind="error" title="กรอกข้อมูลไม่ครบ 2 รายการ">ตรวจสอบช่องที่มีเครื่องหมายแจ้งเตือนด้านล่าง</Banner>
            <Field id="s1" label="เบอร์โทรศัพท์" required error="กรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)"><input id="s1" className="input" aria-invalid defaultValue="081-23" /></Field>
            <Field id="s2" label="อาการเสีย" required error="กรุณาอธิบายอาการเสีย"><textarea id="s2" className="textarea" aria-invalid /></Field></div></Box>
        <Box title="5. Conflict — สถานะถูกเปลี่ยนแล้ว" note="เกิดเมื่อคนอื่นเปลี่ยนสถานะก่อน (optimistic lock) · ให้รีเฟรชแทนการเขียนทับ"><div className="card-pad stack"><Banner kind="error" title="สถานะงานถูกเปลี่ยนแล้ว กรุณารีเฟรช">ช่างเอ เริ่มตรวจสอบงานนี้ไปเมื่อสักครู่</Banner><button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>รีเฟรชหน้านี้</button></div></Box>
        <Box title="6. Disabled พร้อมเหตุผล" note="ปุ่มที่กดไม่ได้ต้องบอกว่าขาดอะไร (guard ของ workflow)"><div className="card-pad stack-sm"><button className="btn btn-lg btn-primary" disabled>{ACTION_LABEL.MARK_READY}</button><span className="err xs"><CircleAlert className="icon" />ต้องแนบรูปหลังซ่อมอย่างน้อย 1 รูป</span></div></Box>
        <Box title="7. Forbidden / ไม่พบ" note="ช่างเปิดงานที่ไม่ได้รับมอบหมาย · แสดงเป็น “ไม่พบ” เพื่อไม่เผยว่ามีงานนี้อยู่"><EmptyState icon={Lock} title="ไม่พบข้อมูล" action={<button className="btn btn-primary">กลับกระดานงาน</button>}>ไม่พบหน้านี้ หรือคุณไม่มีสิทธิ์เข้าถึง</EmptyState></Box>
        <Box title="8. Upload — ผิดประเภท / เกินขนาด" note="ข้อความระบุข้อจำกัดชัดเจน · ไม่ล้างฟอร์มเดิม"><div className="card-pad stack"><Banner kind="error" title="อัปโหลดไม่สำเร็จ">ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF</Banner><Banner kind="error" title="อัปโหลดไม่สำเร็จ">ไฟล์ใหญ่เกิน 10MB</Banner></div></Box>
        <Box title="9. Upload — กำลังอัปโหลด" note="แสดงความคืบหน้า · ปุ่มเลือกไฟล์ถูกแทนที่ระหว่างทำงาน"><div className="card-pad"><div className="dropzone" aria-busy="true"><div className="stack-sm"><span>กำลังอัปโหลด after-fix.jpg…</span><div className="progress"><i style={{ width: "65%" }} /></div></div></div></div></Box>
        <Box title="10. Success — Toast" note="ยืนยันผลการทำงานแบบไม่ขวางการใช้งาน · หายเองใน 4.5 วินาที (role=status)"><div className="card-pad"><div className="toast" style={{ animation: "none", position: "static" }}><CircleCheck className="icon-lg" aria-hidden /><span className="grow">ส่งใบเสนอราคาให้ลูกค้าแล้ว</span></div></div></Box>
        <Box title="11. Login — ข้อผิดพลาด" note="ไม่บอกว่าอีเมลหรือรหัสผ่านผิดข้อไหน เพื่อความปลอดภัย"><div className="card-pad stack"><Banner kind="error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</Banner><Banner kind="warn" title="บัญชีของคุณถูกปิดใช้งาน">กรุณาติดต่อผู้ดูแลระบบ</Banner></div></Box>
        <Box title="12. ระบบขัดข้อง / ออฟไลน์" note="ทางออกคือ “ลองใหม่” · ข้อมูลที่กรอกไว้ไม่หาย"><div className="card-pad stack"><EmptyState icon={ServerCrash} title="ระบบขัดข้องชั่วคราว" action={<button className="btn btn-primary">ลองใหม่อีกครั้ง</button>}>ไม่สามารถโหลดข้อมูลได้ ข้อมูลที่คุณกรอกยังอยู่ครบ</EmptyState><Banner kind="warn" title="ไม่มีการเชื่อมต่ออินเทอร์เน็ต"><WifiOff className="icon" style={{ verticalAlign: "-3px" }} /> ระบบจะลองเชื่อมต่อใหม่อัตโนมัติ</Banner></div></Box>
        <Box title="13. งานปิดแล้ว (Completed / Cancelled)" note="ล็อกทุกการดำเนินการ และการแนบไฟล์"><div className="card-pad"><p className="muted small">งานนี้ปิดแล้ว ไม่มีรายการที่ต้องดำเนินการ และไม่สามารถแนบไฟล์เพิ่ม</p></div></Box>
        <Box title="14. ลิงก์ติดตามไม่ถูกต้อง (ลูกค้า)" note="หน้าสาธารณะ · ไม่เปิดเผยข้อมูลใด ๆ"><EmptyState icon={SearchX} title="ไม่พบลิงก์ติดตามงาน">ลิงก์อาจไม่ถูกต้องหรือพิมพ์ผิด กรุณาตรวจสอบจากใบรับงาน</EmptyState></Box>
      </div>
    </div>
  );
}
