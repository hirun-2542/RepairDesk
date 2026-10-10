import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canViewJob } from "@/domain/permissions";
import { readUpload } from "@/server/storage";

function contentDisposition(fileName: string) {
  const ascii = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\\r\n]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** The only route that serves uploads: staff who may view the job, or the job's tracking token. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, trackingToken: true, technicianId: true } },
    },
  });
  if (!attachment) return new Response(null, { status: 404 });

  const token = new URL(request.url).searchParams.get("t");
  let allowed = false;
  // A tracking token never unlocks payment slips, which expose bank details.
  if (token && token === attachment.job.trackingToken)
    allowed = attachment.stage !== "PAYMENT_SLIP";
  if (!allowed) {
    const user = await currentUser();
    allowed = !!user && canViewJob(user, attachment.job);
  }
  if (!allowed) return new Response(null, { status: 404 });

  const bytes = await readUpload(attachment.storedName);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": contentDisposition(attachment.fileName),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
