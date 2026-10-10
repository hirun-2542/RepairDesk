"use server";
import { revalidatePath } from "next/cache";
import { DomainError } from "@/server/errors";
import { decideByToken } from "@/server/tracking-service";

/**
 * Customer decision from the tracking link. The client never sends a job id: the job is resolved
 * from the token server-side, and the decision literal + rendered revision are validated here.
 */
export async function decideQuoteByToken(token: string, decision: string, revision: number) {
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { ok: false as const, error: "ไม่สามารถทำรายการนี้ได้" };
  }
  if (!Number.isInteger(revision) || revision < 0) {
    return { ok: false as const, error: "ไม่สามารถทำรายการนี้ได้" };
  }
  try {
    await decideByToken(token, decision, revision);
    revalidatePath(`/track/${token}`);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false as const, error: error.message };
    throw error;
  }
}
