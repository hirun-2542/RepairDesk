import { z } from "zod";
import type { Actor } from "@/domain/types";
import { mutateJob } from "./workflow-service";
import { DomainError } from "./errors";
export const paymentSchema = z
  .object({
    method: z.enum(["CASH", "TRANSFER", "CARD"]),
    reference: z.string().trim().max(200).optional(),
  })
  .strict();
export type PaymentInput = z.infer<typeof paymentSchema>;
export async function completeJob(
  actor: Actor,
  id: string,
  input: PaymentInput,
  revision?: number,
) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("ข้อมูลการชำระเงินไม่ถูกต้อง");
  return mutateJob(actor, id, "COMPLETE", revision, async (tx, job, fresh) => {
    if (fresh.kind !== "USER") throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
    const quote = job.quotes.find((q) => q.status === "APPROVED");
    if (!quote) throw new DomainError("ไม่พบใบเสนอราคาที่อนุมัติ");
    if (
      parsed.data.method === "TRANSFER" &&
      !job.attachments.some((file) => file.stage === "PAYMENT_SLIP")
    )
      throw new DomainError("กรุณาแนบสลิปการโอนก่อน");
    await tx.payment.create({
      data: {
        jobId: id,
        kind: "REPAIR",
        method: parsed.data.method,
        amount: quote.total,
        reference: parsed.data.reference,
        receivedById: fresh.id,
      },
    });
    return { after: { method: parsed.data.method, amount: quote.total } };
  });
}
export const cancelSchema = z
  .object({
    reason: z.string().trim().min(1, "กรุณาระบุเหตุผลการยกเลิก"),
    feeSatang: z.number().int().min(0).max(2147483647),
    method: z.enum(["CASH", "TRANSFER", "CARD"]).optional(),
  })
  .strict();
export type CancelInput = z.infer<typeof cancelSchema>;
export async function cancelJob(
  actor: Actor,
  id: string,
  input: CancelInput,
  revision?: number,
) {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0].message);
  if (parsed.data.feeSatang > 0 && !parsed.data.method)
    throw new DomainError("กรุณาเลือกวิธีรับชำระค่าตรวจเช็ค");
  return mutateJob(actor, id, "CANCEL", revision, async (tx, job, fresh) => {
    if (fresh.kind !== "USER") throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
    if (parsed.data.feeSatang > 0) {
      await tx.payment.create({
        data: {
          jobId: id,
          kind: "INSPECTION_FEE",
          method: parsed.data.method!,
          amount: parsed.data.feeSatang,
          receivedById: fresh.id,
        },
      });
    }
    return {
      data: { cancelReason: parsed.data.reason },
      after: {
        reason: parsed.data.reason,
        inspectionFee: parsed.data.feeSatang,
      },
    };
  });
}
