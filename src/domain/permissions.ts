import type { AttachmentStage, JobStatus, Role } from "./types";

type User = { id: string; role: Role };
type JobRef = { technicianId: string | null };
type JobRefWithStatus = JobRef & { status: JobStatus };

const ASSIGNABLE_STATUSES: JobStatus[] = ["RECEIVED", "DIAGNOSING", "APPROVED", "REPAIRING"];
const CLOSED_STATUSES: JobStatus[] = ["COMPLETED", "CANCELLED"];

export function canViewJob(user: User, job: JobRef): boolean {
  if (user.role === "ADMIN" || user.role === "FRONT_DESK") return true;
  return job.technicianId === user.id;
}

export function canAssign(user: User, status: JobStatus): boolean {
  if (user.role === "TECHNICIAN") return false;
  return ASSIGNABLE_STATUSES.includes(status);
}

export function uploadableStages(user: User, job: JobRefWithStatus): AttachmentStage[] {
  if (CLOSED_STATUSES.includes(job.status)) return [];
  if (user.role === "ADMIN") return ["INTAKE", "DIAGNOSIS", "BEFORE", "AFTER", "PAYMENT_SLIP"];
  if (user.role === "FRONT_DESK") return ["INTAKE", "PAYMENT_SLIP"];
  return job.technicianId === user.id ? ["DIAGNOSIS", "BEFORE", "AFTER"] : [];
}

export function canManageUsers(user: User): boolean {
  return user.role === "ADMIN";
}
