import type { JobStatus, Role, Stage } from "./types";

export function uploadableStages(u: { id: string; role: Role }, j: { technicianId: string | null; status: JobStatus }): Stage[] {
  if (j.status === "COMPLETED" || j.status === "CANCELLED") return [];
  if (u.role === "ADMIN") return ["INTAKE", "DIAGNOSIS", "BEFORE", "AFTER", "PAYMENT_SLIP"];
  if (u.role === "FRONT_DESK") return ["INTAKE", "PAYMENT_SLIP"];
  return j.technicianId === u.id ? ["DIAGNOSIS", "BEFORE", "AFTER"] : [];
}
