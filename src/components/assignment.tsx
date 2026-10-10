"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { assignAction } from "@/app/(staff)/jobs/[id]/assignment-actions";
export function Assignment({
  jobId,
  technicianId,
  revision,
  technicians,
}: {
  jobId: string;
  technicianId: string | null;
  revision: number;
  technicians: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  return (
    <div className="card card-pad stack-sm">
      <h3>ช่างผู้รับผิดชอบ</h3>
      <label htmlFor="assign" className="sr-only">
        มอบหมายช่าง
      </label>
      <select
        id="assign"
        className="select"
        value={technicianId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            const result = await assignAction(jobId, id, revision);
            if (result.ok) toast.success("มอบหมายช่างเรียบร้อย");
            else toast.error(result.error);
          });
        }}
      >
        <option value="" disabled>
          เลือกช่าง
        </option>
        {technicians.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
