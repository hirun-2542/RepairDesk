import type { Category, JobStatus, PayMethod, Role, Stage, JobAction } from "./types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  RECEIVED: "รับงาน", DIAGNOSING: "กำลังตรวจสอบ", QUOTED: "รออนุมัติราคา", APPROVED: "อนุมัติแล้ว",
  REPAIRING: "กำลังซ่อม", READY_FOR_PICKUP: "รอชำระ/รับเครื่อง", COMPLETED: "เสร็จสิ้น", CANCELLED: "ยกเลิก",
};
export const STATUS_ORDER: JobStatus[] = [
  "RECEIVED", "DIAGNOSING", "QUOTED", "APPROVED", "REPAIRING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED",
];
export const MAIN_FLOW: JobStatus[] = STATUS_ORDER.slice(0, 7);
export const CATEGORY_LABEL: Record<Category, string> = {
  PHONE: "มือถือ", COMPUTER: "คอมพิวเตอร์", CAR: "รถยนต์", AIRCON: "เครื่องปรับอากาศ",
};
export const IDENTIFIER_LABEL: Record<Category, string> = {
  PHONE: "IMEI / Serial", COMPUTER: "Serial", CAR: "ทะเบียนรถ", AIRCON: "Serial",
};
export const ROLE_LABEL: Record<Role, string> = { ADMIN: "ผู้ดูแลระบบ", FRONT_DESK: "หน้าร้าน", TECHNICIAN: "ช่าง" };
export const STAGE_LABEL: Record<Stage, string> = {
  INTAKE: "รับเครื่อง", DIAGNOSIS: "ผลตรวจ", BEFORE: "ก่อนซ่อม", AFTER: "หลังซ่อม", PAYMENT_SLIP: "สลิปชำระเงิน",
};
export const METHOD_LABEL: Record<PayMethod, string> = { CASH: "เงินสด", TRANSFER: "โอนเงิน", CARD: "บัตร" };
export const ACTION_LABEL: Record<JobAction, string> = {
  START_DIAGNOSIS: "เริ่มตรวจสอบ", SUBMIT_QUOTE: "ส่งใบเสนอราคา",
  APPROVE_QUOTE: "บันทึกลูกค้าอนุมัติ (แทนลูกค้า)", REJECT_QUOTE: "บันทึกลูกค้าปฏิเสธ (แทนลูกค้า)",
  REQUOTE: "เสนอราคาใหม่", START_REPAIR: "เริ่มซ่อม", MARK_READY: "ซ่อมเสร็จ พร้อมรับเครื่อง",
  COMPLETE: "รับชำระเงินและปิดงาน", CANCEL: "ยกเลิกงาน",
};
export const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "เข้าสู่ระบบ", "auth.login_failed": "เข้าสู่ระบบไม่สำเร็จ",
  "user.create": "สร้างผู้ใช้", "user.update": "แก้ไขผู้ใช้",
  "job.create": "รับงานใหม่", "job.assign": "มอบหมายช่าง", "job.start_diagnosis": "เริ่มตรวจสอบ",
  "job.submit_quote": "ส่งใบเสนอราคา", "job.approve_quote": "อนุมัติใบเสนอราคา",
  "job.reject_quote": "ปฏิเสธใบเสนอราคา", "job.requote": "เสนอราคาใหม่", "job.start_repair": "เริ่มซ่อม",
  "job.mark_ready": "ซ่อมเสร็จ", "job.complete": "รับชำระและปิดงาน", "job.cancel": "ยกเลิกงาน",
  "attachment.upload": "แนบไฟล์",
};
