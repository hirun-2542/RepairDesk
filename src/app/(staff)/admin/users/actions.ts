"use server";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/enums";
import { requireUser, toActor } from "@/lib/session";
import { DomainError } from "@/server/errors";
import {
  createUser,
  updateUser,
  USER_ERRORS,
  type UpdateUserPatch,
} from "@/server/user-service";

export type FieldName = "name" | "email" | "password";
export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: string; field?: FieldName };
export type UpdateUserResult = { ok: true } | { ok: false; error: string };

const FIELD_BY_ERROR: Record<string, FieldName> = {
  [USER_ERRORS.nameRequired]: "name",
  [USER_ERRORS.emailInvalid]: "email",
  [USER_ERRORS.emailTaken]: "email",
  [USER_ERRORS.passwordShort]: "password",
};

export async function createUserAction(
  form: FormData,
): Promise<CreateUserResult> {
  const name = form.get("name");
  const email = form.get("email");
  const password = form.get("password");
  const role = form.get("role");
  const me = await requireUser();
  try {
    await createUser(toActor(me), {
      name: typeof name === "string" ? name : "",
      email: typeof email === "string" ? email : "",
      password: typeof password === "string" ? password : "",
      role: (typeof role === "string" ? role : "") as Role,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError)
      return {
        ok: false,
        error: error.message,
        field: FIELD_BY_ERROR[error.message],
      };
    throw error;
  }
}

export async function updateUserAction(
  id: string,
  patch: UpdateUserPatch,
): Promise<UpdateUserResult> {
  const me = await requireUser();
  try {
    await updateUser(toActor(me), id, patch);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError)
      return { ok: false, error: error.message };
    throw error;
  }
}
