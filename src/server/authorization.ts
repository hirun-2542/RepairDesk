import type { Prisma } from "@/generated/prisma/client";
import type { Actor, Role } from "@/domain/types";
import { DomainError } from "./errors";
export async function requireActor(
  tx: Prisma.TransactionClient,
  actor: Actor,
  roles?: readonly Role[],
) {
  if (actor.kind !== "USER") throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
  const user = await tx.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!user?.active || (roles && !roles.includes(user.role)))
    throw new DomainError("ไม่มีสิทธิ์ทำรายการนี้");
  return {
    kind: "USER" as const,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}
