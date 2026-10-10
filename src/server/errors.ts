export class DomainError extends Error {}

/** Reads an infrastructure error code (Prisma / SQLite) without an unchecked shape cast. */
export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
