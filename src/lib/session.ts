import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return user?.active ? user : null;
}
export async function requireUser(roles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user?.active) redirect("/login?inactive=1");
  if (roles && !roles.includes(user.role)) notFound();
  return user;
}
export function toActor(user: { id: string; name: string; role: Role }) {
  return {
    kind: "USER" as const,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}
