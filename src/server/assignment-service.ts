import { prisma } from "@/lib/db";
import type { Actor } from "@/domain/types";
import { canAssign } from "@/domain/permissions";
import { requireActor } from "./authorization";
import { writeAudit } from "./audit";
import { DomainError } from "./errors";
export async function assignTechnician(
  actor: Actor,
  jobId: string,
  technicianId: string,
  revision?: number,
) {
  return prisma.$transaction(async (tx) => {
    const staff = await requireActor(tx, actor, ["ADMIN", "FRONT_DESK"]);
    const job = await tx.repairJob.findUnique({
      where: { id: jobId },
      include: { technician: { select: { name: true } } },
    });
    if (!job) throw new DomainError("ไม่พบงาน");
    if (revision !== undefined && revision !== job.revision)
      throw new DomainError("สถานะงานถูกเปลี่ยนแล้ว กรุณารีเฟรช");
    if (!canAssign(staff, job.status))
      throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
    const tech = await tx.user.findFirst({
      where: { id: technicianId, role: "TECHNICIAN", active: true },
    });
    if (!tech) throw new DomainError("ช่างที่เลือกไม่พร้อมใช้งาน");
    await tx.repairJob.update({
      where: { id: jobId },
      data: { technicianId, revision: { increment: 1 } },
    });
    await writeAudit(tx, {
      actor: staff,
      action: "job.assign",
      entityType: "RepairJob",
      entityId: jobId,
      jobId,
      before: { technician: job.technician?.name ?? null },
      after: { technician: tech.name },
    });
  });
}
