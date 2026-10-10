"use client";
import { useActionState, useState } from "react";
import { intakeAction } from "./actions";
import { CATEGORY_LABEL, IDENTIFIER_LABEL } from "@/domain/labels";
import type { ItemCategory } from "@/domain/types";
export function IntakeForm({
  customers,
  technicians,
}: {
  customers: { name: string; phone: string }[];
  technicians: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(intakeAction, null);
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<ItemCategory>("PHONE");
  const known = customers.find((c) => c.phone === phone.replace(/[^0-9]/g, ""));
  return (
    <form
      action={action}
      className="card card-pad stack"
      style={{ marginTop: 20 }}
    >
      {state?.error && (
        <p className="banner banner-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.errors && (
        <p className="banner banner-error" role="alert">
          กรอกข้อมูลไม่ครบ {Object.keys(state.errors).length} รายการ
        </p>
      )}
      <h2>ข้อมูลลูกค้า</h2>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="phone">เบอร์โทรศัพท์ *</label>
          <input
            className="input"
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!state?.errors?.phone}
          />
          <p className="field-error">{state?.errors?.phone}</p>
        </div>
        <div className="field">
          <label htmlFor="name">ชื่อลูกค้า *</label>
          <input
            className="input"
            id="name"
            name="name"
            key={known?.name ?? "new"}
            defaultValue={known?.name}
            readOnly={!!known}
            aria-invalid={!!state?.errors?.name}
          />
          <p className="field-error">{state?.errors?.name}</p>
        </div>
      </div>
      {known && (
        <p className="banner banner-info">
          พบลูกค้าเดิมในระบบ — ใช้ข้อมูล {known.name}
        </p>
      )}
      <h2>อุปกรณ์ที่นำมาซ่อม</h2>
      <div className="field">
        <label htmlFor="category">ประเภท</label>
        <select
          id="category"
          name="category"
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value as ItemCategory)}
        >
          {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-3">
        {[
          ["brand", "ยี่ห้อ *"],
          ["model", "รุ่น *"],
          ["identifier", IDENTIFIER_LABEL[category]],
        ].map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              className="input"
              id={key}
              name={key}
              aria-invalid={!!state?.errors?.[key]}
            />
            <p className="field-error">{state?.errors?.[key]}</p>
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="symptom">อาการเสีย *</label>
        <textarea
          className="textarea"
          id="symptom"
          name="symptom"
          aria-invalid={!!state?.errors?.symptom}
        />
        <p className="field-error">{state?.errors?.symptom}</p>
      </div>
      <div className="field">
        <label htmlFor="accessories">อุปกรณ์/สภาพที่มาด้วย</label>
        <input className="input" id="accessories" name="accessories" />
      </div>
      <div className="field">
        <label htmlFor="technicianId">มอบหมายช่าง (ไม่บังคับ)</label>
        <select className="select" name="technicianId" id="technicianId">
          <option value="">ยังไม่มอบหมาย</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกใบรับงาน"}
      </button>
    </form>
  );
}
