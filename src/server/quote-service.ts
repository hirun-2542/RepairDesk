import { z } from "zod";
import type { Actor } from "@/domain/types";
import { computeQuoteTotals } from "@/domain/money";
import { mutateJob } from "./workflow-service";
import { DomainError } from "./errors";
export const quoteInputSchema = z.object({
  diagnosis: z.string().trim().min(1, "กรุณากรอกผลการตรวจสอบ"),
  lines: z
    .array(
      z.object({
        type: z.enum(["LABOR", "PART"]),
        description: z.string().trim().min(1, "กรุณาระบุรายการ"),
        qty: z.number().int().min(1).max(999),
        unitPrice: z.number().int().min(0).max(100000000),
      }),
    )
    .min(1, "กรุณากรอกรายการให้ครบอย่างน้อย 1 รายการ")
    .max(20),
  note: z.string().trim().optional(),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export async function submitQuote(
  actor: Actor,
  id: string,
  input: QuoteInput,
  revision?: number,
) {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0].message);
  return mutateJob(
    actor,
    id,
    "SUBMIT_QUOTE",
    revision,
    async (tx, job, fresh) => {
      if (fresh.kind !== "USER")
        throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
      const version = (job.quotes[0]?.version ?? 0) + 1;
      const total = computeQuoteTotals(parsed.data.lines);
      if (total.total > 2147483647)
        throw new DomainError("จำนวนเงินไม่ถูกต้อง");
      await tx.quote.create({
        data: {
          jobId: id,
          version,
          ...total,
          note: parsed.data.note,
          createdById: fresh.id,
          lines: {
            create: parsed.data.lines.map((line) => ({
              ...line,
              amount: line.qty * line.unitPrice,
            })),
          },
        },
      });
      return {
        data: { diagnosis: parsed.data.diagnosis },
        after: { quoteVersion: version, total: total.total },
      };
    },
  );
}
export async function decideQuote(
  actor: Actor,
  id: string,
  decision: "APPROVE" | "REJECT",
  revision?: number,
) {
  return mutateJob(
    actor,
    id,
    decision === "APPROVE" ? "APPROVE_QUOTE" : "REJECT_QUOTE",
    revision,
    async (tx, job, fresh) => {
      const quote = job.quotes[0];
      if (!quote || quote.status !== "PENDING")
        throw new DomainError("ไม่สามารถทำรายการนี้ในสถานะปัจจุบัน");
      const changed = await tx.quote.updateMany({
        where: { id: quote.id, status: "PENDING" },
        data: {
          status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          decidedAt: new Date(),
          decidedByUserId: fresh.kind === "USER" ? fresh.id : null,
        },
      });
      if (changed.count !== 1)
        throw new DomainError("สถานะงานถูกเปลี่ยนแล้ว กรุณารีเฟรช");
      return {
        after: {
          quoteVersion: quote.version,
          ...(fresh.kind === "USER" ? { onBehalfOfCustomer: true } : {}),
        },
      };
    },
  );
}
