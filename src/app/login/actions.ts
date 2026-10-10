"use server";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
export async function loginAction(_: { error: string } | null, form: FormData) {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: "/jobs",
    });
  } catch (error) {
    if (error instanceof AuthError)
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    throw error;
  }
  return null;
}
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
