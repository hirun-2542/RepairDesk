"use server";
import { requireUser, toActor } from "@/lib/session";
import {
  completeJob,
  cancelJob,
  type PaymentInput,
  type CancelInput,
} from "@/server/payment-service";
import { DomainError } from "@/server/errors";
import { revalidatePath } from "next/cache";
export async function completeAction(
  id: string,
  revision: number,
  input: PaymentInput,
) {
  const user = await requireUser();
  try {
    await completeJob(toActor(user), id, input, revision);
    revalidatePath("/jobs", "layout");
    revalidatePath("/track", "layout");
    return { ok: true as const };
  } catch (error) {
    if (error instanceof DomainError)
      return { ok: false as const, error: error.message };
    throw error;
  }
}
export async function cancelAction(
  id: string,
  revision: number,
  input: CancelInput,
) {
  const user = await requireUser();
  try {
    await cancelJob(toActor(user), id, input, revision);
    revalidatePath("/jobs", "layout");
    revalidatePath("/track", "layout");
    return { ok: true as const };
  } catch (error) {
    if (error instanceof DomainError)
      return { ok: false as const, error: error.message };
    throw error;
  }
}
