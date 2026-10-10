import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Actor, JobStatus, ItemCategory } from "@/domain/types";
import { requireActor } from "./authorization";
import { writeAudit } from "./audit";
import { DomainError } from "./errors";
export const jobDetailInclude = {
  customer: true,
  technician: { select: { id: true, name: true } },
  quotes: {
    orderBy: { version: "desc" as const },
    include: { lines: true, decidedBy: { select: { name: true } } },
  },
  attachments: { orderBy: { createdAt: "asc" as const } },
  payment: { include: { receivedBy: { select: { name: true } } } },
} as const;
export type JobDetail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;
export function getJobDetail(id: string) {
  return prisma.repairJob.findUnique({
    where: { id },
    include: jobDetailInclude,
  });
}
export function getJobByToken(trackingToken: string) {
  return prisma.repairJob.findUnique({
    where: { trackingToken },
    include: jobDetailInclude,
  });
}
export const intakeSchema = z.object({
  phone: z
    .string()
    .transform((s) => s.replace(/[^0-9]/g, ""))
    .refine(
      (s) => /^0[0-9]{8,9}$/.test(s),
      "กรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)",
    ),
  name: z.string().trim().min(1, "กรุณากรอกชื่อลูกค้า"),
  category: z.enum(["PHONE", "COMPUTER", "CAR", "AIRCON"]),
  brand: z.string().trim().min(1, "กรุณากรอกยี่ห้อ"),
  model: z.string().trim().min(1, "กรุณากรอกรุ่น"),
  identifier: z.string().trim().optional(),
  symptom: z.string().trim().min(1, "กรุณาอธิบายอาการเสีย"),
  accessories: z.string().trim().optional(),
  technicianId: z.string().optional(),
});
export async function createJob(
  actor: Actor,
  input: z.input<typeof intakeSchema>,
) {
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) throw new DomainError(parsed.error.issues[0].message);
  const data = parsed.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const staff = await requireActor(tx, actor, ["ADMIN", "FRONT_DESK"]);
        const customer = await tx.customer.upsert({
          where: { phone: data.phone },
          create: { phone: data.phone, name: data.name },
          update: {},
        });
        if (data.technicianId) {
          const tech = await tx.user.findFirst({
            where: { id: data.technicianId, role: "TECHNICIAN", active: true },
          });
          if (!tech) throw new DomainError("ช่างที่เลือกไม่พร้อมใช้งาน");
        }
        const year = new Intl.DateTimeFormat("en", {
          year: "numeric",
          timeZone: "Asia/Bangkok",
        }).format(new Date());
        const prefix = "RJ-" + year + "-";
        const last = await tx.repairJob.findFirst({
          where: { jobNo: { startsWith: prefix } },
          orderBy: { jobNo: "desc" },
        });
        const seq = last ? Number(last.jobNo.slice(prefix.length)) + 1 : 1;
        const job = await tx.repairJob.create({
          data: {
            customerId: customer.id,
            category: data.category,
            brand: data.brand,
            model: data.model,
            identifier: data.identifier || null,
            symptom: data.symptom,
            accessories: data.accessories || null,
            technicianId: data.technicianId || null,
            createdById: staff.id,
            jobNo: prefix + String(seq).padStart(4, "0"),
            trackingToken: randomBytes(24).toString("base64url"),
          },
        });
        await writeAudit(tx, {
          actor: staff,
          action: "job.create",
          entityType: "RepairJob",
          entityId: job.id,
          jobId: job.id,
          after: { status: job.status, jobNo: job.jobNo },
        });
        return job;
      });
    } catch (error) {
      if (attempt === 0 && (error as { code?: string }).code === "P2002")
        continue;
      throw error;
    }
  }
  throw new DomainError("ไม่สามารถสร้างเลขที่งานได้");
}
export async function listJobs(
  filter: {
    q?: string;
    status?: JobStatus;
    category?: ItemCategory;
    technicianId?: string;
    page?: number;
  },
  user: { id: string; role: string },
) {
  const q = filter.q?.trim();
  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    ...(user.role === "TECHNICIAN"
      ? { technicianId: user.id }
      : filter.technicianId
        ? { technicianId: filter.technicianId }
        : {}),
    ...(q
      ? {
          OR: [
            { jobNo: { contains: q } },
            { brand: { contains: q } },
            { model: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q.replace(/-/g, "") } } },
          ],
        }
      : {}),
  };
  const count = await prisma.repairJob.count({ where });
  const page = Math.max(
    1,
    Math.min(Math.ceil(count / 20) || 1, Math.trunc(filter.page || 1)),
  );
  const jobs = await prisma.repairJob.findMany({
    where,
    include: { customer: true, technician: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
  });
  return { jobs, count, page, pages: Math.ceil(count / 20) || 1 };
}
