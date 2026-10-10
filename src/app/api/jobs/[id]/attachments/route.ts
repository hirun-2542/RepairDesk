import { currentUser, toActor } from "@/lib/session";
import { addAttachment } from "@/server/attachment-service";
import { DomainError } from "@/server/errors";
import type { AttachmentStage } from "@/domain/types";

const STAGES: readonly AttachmentStage[] = [
  "INTAKE",
  "DIAGNOSIS",
  "BEFORE",
  "AFTER",
  "PAYMENT_SLIP",
];

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Multipart upload route (not a server action, to escape the 1 MB action body limit). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบ", 401);
  const { id } = await params;
  if (!id) return jsonError("ไม่พบงาน", 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("ข้อมูลอัปโหลดไม่ถูกต้อง", 400);
  }

  const file = form.get("file");
  const stage = form.get("stage");
  if (
    !file ||
    typeof file === "string" ||
    typeof file.arrayBuffer !== "function"
  ) {
    return jsonError("กรุณาเลือกไฟล์", 400);
  }
  if (typeof stage !== "string" || !STAGES.includes(stage as AttachmentStage)) {
    return jsonError("ขั้นตอนการแนบไม่ถูกต้อง", 400);
  }

  try {
    const attachment = await addAttachment(
      toActor(user),
      id,
      stage as AttachmentStage,
      file,
    );
    return Response.json(
      {
        id: attachment.id,
        stage: attachment.stage,
        fileName: attachment.fileName,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DomainError) return jsonError(error.message, 400);
    throw error;
  }
}
