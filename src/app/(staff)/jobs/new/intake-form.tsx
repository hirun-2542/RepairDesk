"use client";
import { useActionState, useState, useTransition } from "react";
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
  const [state, action] = useActionState(intakeAction, null);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<ItemCategory>("PHONE");
  // Every text field is controlled: React 19 resets uncontrolled fields after a form
  // action finishes, which would wipe what the user typed on a validation error.
  const [name, setName] = useState("");
  const [item, setItem] = useState({
    brand: "",
    model: "",
    identifier: "",
    symptom: "",
    accessories: "",
    technicianId: "",
  });
  const known = customers.find((c) => c.phone === phone.replace(/[^0-9]/g, ""));
  const itemFields = [
    {
      key: "brand",
      label: "ยี่ห้อ *",
      value: item.brand,
      set: (value: string) => setItem({ ...item, brand: value }),
    },
    {
      key: "model",
      label: "รุ่น *",
      value: item.model,
      set: (value: string) => setItem({ ...item, model: value }),
    },
    {
      key: "identifier",
      label: IDENTIFIER_LABEL[category],
      value: item.identifier,
      set: (value: string) => setItem({ ...item, identifier: value }),
    },
  ];
  return (
    <form
      onSubmit={(event) => {
        // Dispatch manually: React 19 auto-resets a form after its `action` prop runs,
        // and that reset clears <select> choices (unlike controlled text inputs) even
        // when the action returns field errors instead of throwing.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
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
            value={known?.name ?? name}
            onChange={(e) => setName(e.target.value)}
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
        {itemFields.map((field) => (
          <div className="field" key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            <input
              className="input"
              id={field.key}
              name={field.key}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              aria-invalid={!!state?.errors?.[field.key]}
            />
            <p className="field-error">{state?.errors?.[field.key]}</p>
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="symptom">อาการเสีย *</label>
        <textarea
          className="textarea"
          id="symptom"
          name="symptom"
          value={item.symptom}
          onChange={(e) => setItem({ ...item, symptom: e.target.value })}
          aria-invalid={!!state?.errors?.symptom}
        />
        <p className="field-error">{state?.errors?.symptom}</p>
      </div>
      <div className="field">
        <label htmlFor="accessories">อุปกรณ์/สภาพที่มาด้วย</label>
        <input
          className="input"
          id="accessories"
          name="accessories"
          value={item.accessories}
          onChange={(e) => setItem({ ...item, accessories: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="technicianId">มอบหมายช่าง (ไม่บังคับ)</label>
        <select
          className="select"
          name="technicianId"
          id="technicianId"
          value={item.technicianId}
          onChange={(e) => setItem({ ...item, technicianId: e.target.value })}
        >
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
