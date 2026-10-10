import type { AuditEntry, Attachment, Category, Job, JobStatus, Quote, QuoteLine, Stage, User } from "../domain/types";
import { computeQuoteTotals } from "../domain/money";

export const NOW = new Date("2026-10-10T10:30:00+07:00").getTime();
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();

export const USERS: User[] = [
  { id: "u-admin", name: "แอดมิน", email: "admin@demo.local", role: "ADMIN", active: true },
  { id: "u-front", name: "สมศรี หน้าร้าน", email: "frontdesk@demo.local", role: "FRONT_DESK", active: true },
  { id: "u-tech1", name: "ช่างเอ", email: "tech1@demo.local", role: "TECHNICIAN", active: true },
  { id: "u-tech2", name: "ช่างบี", email: "tech2@demo.local", role: "TECHNICIAN", active: true },
  { id: "u-tech3", name: "ช่างซี", email: "tech3@demo.local", role: "TECHNICIAN", active: false },
];
export const DEMO_LOGINS = [
  { key: "admin", userId: "u-admin", label: "ผู้ดูแลระบบ" },
  { key: "front", userId: "u-front", label: "หน้าร้าน" },
  { key: "tech1", userId: "u-tech1", label: "ช่าง 1" },
  { key: "tech2", userId: "u-tech2", label: "ช่าง 2" },
] as const;

const line = (type: QuoteLine["type"], description: string, qty: number, baht: number): QuoteLine =>
  ({ type, description, qty, unitPrice: baht * 100 });
const quote = (version: number, status: Quote["status"], lines: QuoteLine[], h: number, decidedBy?: string): Quote => ({
  version, status, lines, ...computeQuoteTotals(lines), createdAt: ago(h),
  decidedAt: status === "PENDING" ? undefined : ago(h - 3), decidedBy: status === "PENDING" ? undefined : decidedBy,
});
let att = 0;
const file = (stage: Stage, fileName: string, by: string, h: number, mime = "image/jpeg", size = 842_000): Attachment =>
  ({ id: `a${++att}`, stage, fileName, mime, size, uploadedBy: by, at: ago(h) });

type Seed = Omit<Job, "token" | "createdAt" | "updatedAt"> & { h: number };
const seeds: Seed[] = [
  { id: "j1", jobNo: "RJ-2026-0001", h: 1, customer: { name: "สมชาย ใจดี", phone: "081-234-5678" }, category: "PHONE", brand: "Apple", model: "iPhone 14 Pro", identifier: "356938035643809", symptom: "หน้าจอแตกร้าว ทัชไม่ติดบางจุด", accessories: "เคสใส, ซิม 1 ใบ", status: "RECEIVED", technicianId: null, quotes: [], attachments: [file("INTAKE", "รอยแตกมุมซ้าย.jpg", "สมศรี หน้าร้าน", 1)] },
  { id: "j2", jobNo: "RJ-2026-0002", h: 4, customer: { name: "วิภาวดี รัตนพันธ์", phone: "089-555-1122" }, category: "COMPUTER", brand: "Lenovo", model: "ThinkPad T14", identifier: "PF3K8XQ2", symptom: "เปิดเครื่องไม่ติด ไฟชาร์จไม่ขึ้น", accessories: "อะแดปเตอร์", status: "RECEIVED", technicianId: "u-tech1", quotes: [], attachments: [] },
  { id: "j3", jobNo: "RJ-2026-0003", h: 22, customer: { name: "ประเสริฐ วงศ์สกุล", phone: "086-777-4321" }, category: "CAR", brand: "Toyota", model: "Hilux Revo", identifier: "1กข 2345 กรุงเทพมหานคร", symptom: "มีเสียงดังจากช่วงล่างด้านหน้าขวา ขณะเข้าโค้ง", status: "DIAGNOSING", technicianId: "u-tech2", quotes: [], attachments: [file("INTAKE", "ด้านหน้ารถ.jpg", "สมศรี หน้าร้าน", 22), file("DIAGNOSIS", "ลูกหมากล่าง.jpg", "ช่างบี", 5)] },
  { id: "j4", jobNo: "RJ-2026-0004", h: 52, customer: { name: "อรวรรณ แสงทอง", phone: "082-100-9988" }, category: "AIRCON", brand: "Daikin", model: "Inverter 12,000 BTU", identifier: "DK12K-77841", symptom: "ไม่เย็น มีน้ำหยดจากคอยล์เย็น", status: "QUOTED", technicianId: "u-tech1", diagnosis: "คอมเพรสเซอร์ทำงานแต่น้ำยาแอร์รั่วที่ท่อทองแดงจุดต่อ ต้องเชื่อมซ่อมและเติมน้ำยา R32", quotes: [quote(1, "REJECTED", [line("LABOR", "เชื่อมท่อทองแดง + ทดสอบรั่ว", 1, 1800), line("PART", "น้ำยาแอร์ R32 (ชุดเติม)", 1, 1500), line("LABOR", "ล้างแอร์ครบชุด", 1, 700)], 30, "CUSTOMER")], attachments: [file("INTAKE", "คอยล์เย็น.jpg", "สมศรี หน้าร้าน", 52), file("DIAGNOSIS", "จุดรั่ว.jpg", "ช่างเอ", 32)] },
  { id: "j5", jobNo: "RJ-2026-0005", h: 70, customer: { name: "ธนากร เจริญสุข", phone: "084-321-0099" }, category: "PHONE", brand: "Samsung", model: "Galaxy S23", identifier: "R5CW31XXXXX", symptom: "แบตเสื่อมเร็ว เครื่องร้อน", status: "QUOTED", technicianId: "u-tech1", diagnosis: "แบตเตอรี่บวม ค่าสุขภาพแบต 71%", quotes: [quote(1, "REJECTED", [line("PART", "แบตเตอรี่แท้", 1, 2400), line("LABOR", "ค่าแรงเปลี่ยนแบต", 1, 500)], 50, "ลูกค้า"), quote(2, "PENDING", [line("PART", "แบตเตอรี่เกรดเทียบเท่า (รับประกัน 6 เดือน)", 1, 1400), line("LABOR", "ค่าแรงเปลี่ยนแบต", 1, 400)], 6)], attachments: [file("INTAKE", "ตัวเครื่อง.jpg", "สมศรี หน้าร้าน", 70), file("DIAGNOSIS", "แบตบวม.jpg", "ช่างเอ", 55)] },
  { id: "j6", jobNo: "RJ-2026-0006", h: 30, customer: { name: "กมลชนก พิทักษ์", phone: "085-909-2200" }, category: "COMPUTER", brand: "Apple", model: "MacBook Air M1", identifier: "C02XL1ABCDEF", symptom: "คีย์บอร์ดบางปุ่มกดไม่ติด", status: "APPROVED", technicianId: "u-tech2", diagnosis: "ชุดคีย์บอร์ดเสีย ต้องเปลี่ยนทั้งชุด", quotes: [quote(1, "APPROVED", [line("PART", "ชุดคีย์บอร์ด + Top case", 1, 4200), line("LABOR", "ค่าแรง", 1, 800)], 20, "ลูกค้า")], attachments: [file("INTAKE", "คีย์บอร์ด.jpg", "สมศรี หน้าร้าน", 30), file("DIAGNOSIS", "ผลตรวจ.pdf", "ช่างบี", 24, "application/pdf", 214_000)] },
  { id: "j7", jobNo: "RJ-2026-0007", h: 80, customer: { name: "นพดล ศรีสวัสดิ์", phone: "087-444-6677" }, category: "CAR", brand: "Honda", model: "City 1.0 Turbo", identifier: "3ขค 8899 เชียงใหม่", symptom: "เบรกหน้ามีเสียงดังเอี๊ยด", status: "REPAIRING", technicianId: "u-tech1", diagnosis: "ผ้าเบรกหน้าหมด จานเบรกมีรอยร้าว", quotes: [quote(1, "APPROVED", [line("PART", "ผ้าเบรกหน้า (ชุด)", 1, 1900), line("PART", "จานเบรกหน้า (คู่)", 1, 3600), line("LABOR", "ค่าแรง", 1, 900)], 60, "สมศรี หน้าร้าน")], attachments: [file("INTAKE", "ล้อหน้า.jpg", "สมศรี หน้าร้าน", 80), file("BEFORE", "จานเบรกก่อนซ่อม.jpg", "ช่างเอ", 8)] },
  { id: "j8", jobNo: "RJ-2026-0008", h: 96, customer: { name: "ศิริพร อินทรโชติ", phone: "083-222-3344" }, category: "AIRCON", brand: "Mitsubishi", model: "Mr.Slim 18,000 BTU", symptom: "คอมพ์ไม่ทำงาน แอร์ไม่เย็น", status: "REPAIRING", technicianId: "u-tech2", diagnosis: "คาปาซิเตอร์คอมเพรสเซอร์เสื่อม", quotes: [quote(1, "APPROVED", [line("PART", "คาปาซิเตอร์ 35uF", 1, 650), line("LABOR", "ค่าแรง + ทดสอบ", 1, 800)], 70, "ลูกค้า")], attachments: [file("BEFORE", "ตู้คอยล์ร้อน.jpg", "ช่างบี", 24), file("AFTER", "หลังเปลี่ยนคาปาซิเตอร์.jpg", "ช่างบี", 2)] },
  { id: "j9", jobNo: "RJ-2026-0009", h: 120, customer: { name: "ภานุวัฒน์ ทองคำ", phone: "081-870-1212" }, category: "PHONE", brand: "OPPO", model: "Reno 8", identifier: "861234050123456", symptom: "ชาร์จไม่เข้า", status: "READY_FOR_PICKUP", technicianId: "u-tech1", diagnosis: "พอร์ตชาร์จเสีย", quotes: [quote(1, "APPROVED", [line("PART", "แพนชาร์จ", 1, 650), line("LABOR", "ค่าแรง", 1, 350)], 100, "ลูกค้า")], attachments: [file("INTAKE", "ตัวเครื่อง.jpg", "สมศรี หน้าร้าน", 120), file("AFTER", "หลังซ่อม.jpg", "ช่างเอ", 4)] },
  { id: "j10", jobNo: "RJ-2026-0010", h: 170, customer: { name: "สุรชัย พงษ์พานิช", phone: "080-111-2233" }, category: "COMPUTER", brand: "Dell", model: "Inspiron 15", identifier: "7GTK2P3", symptom: "ช้า ค้าง เปลี่ยนเป็น SSD", status: "COMPLETED", technicianId: "u-tech2", diagnosis: "HDD เสีย bad sector", quotes: [quote(1, "APPROVED", [line("PART", "SSD 512GB", 1, 1500), line("LABOR", "ติดตั้ง + ลง Windows", 1, 600)], 150, "ลูกค้า")], attachments: [file("AFTER", "ติดตั้ง SSD.jpg", "ช่างบี", 90)], payment: { kind: "REPAIR", method: "CASH", amount: 224700, paidAt: ago(72), receivedBy: "สมศรี หน้าร้าน" } },
  { id: "j11", jobNo: "RJ-2026-0011", h: 200, customer: { name: "จิราพร สมบูรณ์", phone: "086-345-6789" }, category: "CAR", brand: "Mazda", model: "Mazda 2", identifier: "5กน 1020 ชลบุรี", symptom: "แอร์รถไม่เย็น", status: "COMPLETED", technicianId: "u-tech1", diagnosis: "คอมแอร์ตัน เปลี่ยนคอมเพรสเซอร์", quotes: [quote(1, "APPROVED", [line("PART", "คอมเพรสเซอร์แอร์", 1, 8900), line("LABOR", "ค่าแรง + เติมน้ำยา", 1, 1500)], 180, "ลูกค้า")], attachments: [file("AFTER", "หลังซ่อม.jpg", "ช่างเอ", 100), file("PAYMENT_SLIP", "สลิปโอน.jpg", "สมศรี หน้าร้าน", 96)], payment: { kind: "REPAIR", method: "TRANSFER", amount: 1112800, reference: "KBank 20261006 1022", paidAt: ago(96), receivedBy: "สมศรี หน้าร้าน" } },
  { id: "j12", jobNo: "RJ-2026-0012", h: 140, customer: { name: "ปรียา ชัยมงคล", phone: "088-000-1357" }, category: "PHONE", brand: "Xiaomi", model: "Redmi Note 12", symptom: "ตกน้ำ เปิดไม่ติด", status: "CANCELLED", technicianId: "u-tech2", cancelReason: "ลูกค้าไม่อนุมัติค่าซ่อม (เมนบอร์ดเสียหาย)", quotes: [quote(1, "REJECTED", [line("PART", "เมนบอร์ดทดแทน", 1, 4500), line("LABOR", "ค่าแรง", 1, 800)], 120, "ลูกค้า")], attachments: [file("DIAGNOSIS", "ร่องรอยน้ำ.jpg", "ช่างบี", 130)], payment: { kind: "INSPECTION_FEE", method: "CASH", amount: 30000, paidAt: ago(110), receivedBy: "สมศรี หน้าร้าน" } },
];

export const JOBS: Job[] = seeds.map(({ h, ...s }, i) => ({
  ...s, token: `tk${String(i + 1).padStart(2, "0")}Z8qLm4VnR2xYc7Hb1PdKfS9aW3`.slice(0, 32), createdAt: ago(h), updatedAt: ago(Math.max(0.5, h / 3)),
}));

const FRONT = "สมศรี หน้าร้าน (หน้าร้าน)";
const label = (id: string | null) => ({ "u-tech1": "ช่างเอ (ช่าง)", "u-tech2": "ช่างบี (ช่าง)" } as Record<string, string>)[id ?? ""] ?? "แอดมิน (ผู้ดูแลระบบ)";
const PATH: JobStatus[] = ["RECEIVED", "DIAGNOSING", "QUOTED", "APPROVED", "REPAIRING", "READY_FOR_PICKUP", "COMPLETED"];
let aid = 0;
export function seedAudit(): AuditEntry[] {
  const out: AuditEntry[] = [];
  const push = (e: Omit<AuditEntry, "id">) => out.push({ id: `l${++aid}`, ...e });
  for (const j of JOBS) {
    let t = new Date(j.createdAt).getTime();
    const step = (m: number) => new Date((t += m * 60_000)).toISOString();
    const at = (iso: string) => { t = new Date(iso).getTime(); return iso; };
    const tech = label(j.technicianId);
    push({ at: step(0), actorType: "USER", actorLabel: FRONT, action: "job.create", entityType: "RepairJob", jobId: j.id, after: { status: "RECEIVED", jobNo: j.jobNo } });
    if (j.technicianId) push({ at: step(8), actorType: "USER", actorLabel: FRONT, action: "job.assign", entityType: "RepairJob", jobId: j.id, before: { technician: null }, after: { technician: tech.split(" ")[0] } });
    if (j.attachments.some((a) => a.stage === "INTAKE")) push({ at: step(5), actorType: "USER", actorLabel: FRONT, action: "attachment.upload", entityType: "Attachment", jobId: j.id, after: { stage: "INTAKE" } });
    const idx = j.status === "CANCELLED" ? 2 : PATH.indexOf(j.status);
    if (idx >= 1) push({ at: step(90), actorType: "USER", actorLabel: tech, action: "job.start_diagnosis", entityType: "RepairJob", jobId: j.id, before: { status: "RECEIVED" }, after: { status: "DIAGNOSING" } });
    j.quotes.forEach((q) => {
      push({ at: at(q.createdAt), actorType: "USER", actorLabel: tech, action: "job.submit_quote", entityType: "Quote", jobId: j.id, before: { status: "DIAGNOSING" }, after: { status: "QUOTED", quoteVersion: q.version, total: q.total } });
      if (q.status !== "PENDING") {
        const byCustomer = q.decidedBy === "CUSTOMER" || q.decidedBy === "ลูกค้า";
        push({ at: at(q.decidedAt!), actorType: byCustomer ? "CUSTOMER" : "USER", actorLabel: byCustomer ? "ลูกค้า (ลิงก์ติดตามงาน)" : FRONT,
          action: q.status === "APPROVED" ? "job.approve_quote" : "job.reject_quote", entityType: "Quote", jobId: j.id,
          before: { status: "QUOTED" }, after: { status: q.status === "APPROVED" ? "APPROVED" : "QUOTED", quoteVersion: q.version, ...(byCustomer ? {} : { onBehalfOfCustomer: true }) } });
        if (q.status === "REJECTED" && j.quotes.length > q.version) push({ at: step(30), actorType: "USER", actorLabel: FRONT, action: "job.requote", entityType: "RepairJob", jobId: j.id, before: { status: "QUOTED" }, after: { status: "DIAGNOSING" } });
      }
    });
    if (idx >= 4) push({ at: step(240), actorType: "USER", actorLabel: tech, action: "job.start_repair", entityType: "RepairJob", jobId: j.id, before: { status: "APPROVED" }, after: { status: "REPAIRING" } });
    if (idx >= 5) push({ at: step(600), actorType: "USER", actorLabel: tech, action: "job.mark_ready", entityType: "RepairJob", jobId: j.id, before: { status: "REPAIRING" }, after: { status: "READY_FOR_PICKUP" } });
    if (j.status === "COMPLETED") push({ at: at(j.payment!.paidAt), actorType: "USER", actorLabel: FRONT, action: "job.complete", entityType: "Payment", jobId: j.id, before: { status: "READY_FOR_PICKUP" }, after: { status: "COMPLETED", method: j.payment?.method, amount: j.payment?.amount } });
    if (j.status === "CANCELLED") push({ at: j.payment ? at(j.payment.paidAt) : step(60), actorType: "USER", actorLabel: FRONT, action: "job.cancel", entityType: "RepairJob", jobId: j.id, before: { status: "QUOTED" }, after: { status: "CANCELLED", reason: j.cancelReason, inspectionFee: j.payment?.amount } });
  }
  out.push({ id: `l${++aid}`, at: ago(0.3), actorType: "ANONYMOUS", actorLabel: "somchai@mail.com", action: "auth.login_failed", entityType: "User" });
  out.push({ id: `l${++aid}`, at: ago(0.2), actorType: "USER", actorLabel: "แอดมิน (ผู้ดูแลระบบ)", action: "user.update", entityType: "User", before: { user: "ช่างซี", active: true }, after: { user: "ช่างซี", active: false } });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export const CATEGORIES: Category[] = ["PHONE", "COMPUTER", "CAR", "AIRCON"];
