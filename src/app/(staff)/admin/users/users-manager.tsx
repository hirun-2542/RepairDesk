"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { createUserAction, updateUserAction } from "./actions";

const ROLE_LABEL: Record<Role, string> = { ADMIN: "ผู้ดูแลระบบ", FRONT_DESK: "หน้าร้าน", TECHNICIAN: "ช่าง" };
const ROLE_ORDER: readonly Role[] = ["ADMIN", "FRONT_DESK", "TECHNICIAN"];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export type UserRow = { id: string; name: string; email: string; role: Role; active: boolean };

export function UsersManager({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TECHNICIAN" as Role });
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");

  function applyUpdate(id: string, patch: { role?: Role; active?: boolean }, successMessage: string) {
    startTransition(async () => {
      const result = await updateUserAction(id, patch);
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = "กรุณากรอกชื่อ";
    if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = "อีเมลไม่ถูกต้อง";
    if (form.password.length < 8) nextErrors.password = "รหัสผ่านอย่างน้อย 8 ตัวอักษร";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    const data = new FormData();
    data.set("name", form.name);
    data.set("email", form.email);
    data.set("password", form.password);
    data.set("role", form.role);
    startTransition(async () => {
      const result = await createUserAction(data);
      if (!result.ok) {
        setErrors(result.field ? { [result.field]: result.error } : {});
        setFormError(result.field ? "" : result.error);
        toast.error(result.error);
        return;
      }
      setForm({ name: "", email: "", password: "", role: "TECHNICIAN" });
      setErrors({});
      toast.success("สร้างผู้ใช้เรียบร้อย");
      router.refresh();
    });
  }

  return (
    <div className="detail detail-users">
      <div className="card">
        <div className="tablewrap">
          <table>
            <caption className="sr-only">รายชื่อผู้ใช้</caption>
            <thead>
              <tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === meId;
                return (
                  <tr key={u.id} style={u.active ? undefined : { opacity: 0.65 }}>
                    <td className="strong">
                      {u.name}
                      {isSelf && <span className="tag" style={{ marginLeft: 8 }}>คุณ</span>}
                    </td>
                    <td className="muted">{u.email}</td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>บทบาทของ {u.name}</label>
                      <select
                        id={`role-${u.id}`}
                        className="select select-sm"
                        value={u.role}
                        disabled={isSelf || pending}
                        onChange={(e) => applyUpdate(u.id, { role: e.target.value as Role }, "เปลี่ยนบทบาทเรียบร้อย")}
                      >
                        {ROLE_ORDER.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={u.active}
                          aria-label={`${u.active ? "ปิด" : "เปิด"}ใช้งาน ${u.name}`}
                          className="switch"
                          disabled={isSelf || pending}
                          onClick={() => applyUpdate(u.id, { active: !u.active }, u.active ? "ปิดใช้งานผู้ใช้แล้ว" : "เปิดใช้งานผู้ใช้แล้ว")}
                        >
                          <i />
                        </button>
                        <span className="small">{u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>บัญชีของคุณแก้ไขเองไม่ได้ เพื่อป้องกันการล็อกตัวเองออกจากระบบ</span>
        </div>
      </div>

      <form className="card card-pad stack" onSubmit={onSubmit} noValidate>
        <h2 className="row"><UserPlus className="icon-lg" aria-hidden />สร้างผู้ใช้ใหม่</h2>
        {formError && <p role="alert" className="banner banner-error">{formError}</p>}
        <div className="field">
          <label htmlFor="new-name">ชื่อ<span className="req">*</span></label>
          <input id="new-name" className="input" value={form.name} aria-invalid={!!errors.name} autoComplete="off" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="new-email">อีเมล<span className="req">*</span></label>
          <input id="new-email" className="input" type="email" value={form.email} aria-invalid={!!errors.email} autoComplete="off" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="new-password">รหัสผ่าน<span className="req">*</span></label>
          <input id="new-password" className="input" type="password" value={form.password} aria-invalid={!!errors.password} autoComplete="new-password" aria-describedby="new-password-help" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p id="new-password-help" className="help">อย่างน้อย 8 ตัวอักษร</p>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <div className="field">
          <label htmlFor="new-role">บทบาท</label>
          <select id="new-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLE_ORDER.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "สร้างผู้ใช้"}</button>
      </form>
    </div>
  );
}
