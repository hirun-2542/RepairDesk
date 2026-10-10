import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { JobBoard } from "./board";

export default async function Jobs() {
  const user = await requireUser();
  // Server-enforced scope: a technician only ever loads jobs assigned to them.
  const jobs = await prisma.repairJob.findMany({
    where: user.role === "TECHNICIAN" ? { technicianId: user.id } : {},
    include: {
      customer: { select: { name: true } },
      technician: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return <JobBoard jobs={jobs} role={user.role} />;
}
