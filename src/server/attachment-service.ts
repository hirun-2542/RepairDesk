import { prisma } from "@/lib/db";
import type { Actor, AttachmentStage } from "@/domain/types";
import { uploadableStages } from "@/domain/permissions";
import { requireActor } from "./authorization";
import { writeAudit } from "./audit";
import { DomainError } from "./errors";
import { deleteUpload, saveUpload } from "./storage";

/** Thai messages thrown as DomainError; the upload route turns them into 400 responses. */
export const ATTACHMENT_ERRORS = {
  jobNotFound: "ไม่พบงาน",
  jobClosed: "งานนี้ปิดแล้ว ไม่สามารถแนบไฟล์เพิ่ม",
  stageForbidden: "ไม่มีสิทธิ์แนบไฟล์ในขั้นตอนนี้",
} as const;

/**
 * Saves the bytes first, then re-checks the actor and the job inside one transaction so a
 * stale page can never upload into a closed job or a stage the actor no longer owns.
 * The job revision bumps on success, invalidating any in-flight workflow command.
 * If the database write fails, the just-saved file is removed.
 */
export async function addAttachment(actor: Actor, jobId: string, stage: AttachmentStage, file: File) {
  const saved = await saveUpload(file);
  try {
    return await prisma.$transaction(async (tx) => {
      const staff = await requireActor(tx, actor);
      const job = await tx.repairJob.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, technicianId: true },
      });
      if (!job) throw new DomainError(ATTACHMENT_ERRORS.jobNotFound);
      if (job.status === "COMPLETED" || job.status === "CANCELLED") throw new DomainError(ATTACHMENT_ERRORS.jobClosed);
      if (!uploadableStages(staff, job).includes(stage)) throw new DomainError(ATTACHMENT_ERRORS.stageForbidden);
      const attachment = await tx.attachment.create({
        data: {
          jobId,
          stage,
          fileName: saved.fileName,
          storedName: saved.storedName,
          mimeType: saved.mimeType,
          size: saved.size,
          uploadedById: staff.id,
        },
      });
      await tx.repairJob.update({ where: { id: jobId }, data: { revision: { increment: 1 } } });
      await writeAudit(tx, {
        actor: staff,
        action: "attachment.upload",
        entityType: "Attachment",
        entityId: attachment.id,
        jobId,
        after: { stage, fileName: saved.fileName, size: saved.size },
      });
      return attachment;
    });
  } catch (error) {
    await deleteUpload(saved.storedName);
    throw error;
  }
}
