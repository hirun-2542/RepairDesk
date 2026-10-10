import type { AuditAction } from "./types";

/** Every audit action the app writes, in the order shown in the filter dropdown. */
export const AUDIT_ACTIONS: AuditAction[] = [
  "auth.login",
  "auth.login_failed",
  "user.create",
  "user.update",
  "job.create",
  "job.assign",
  "job.start_diagnosis",
  "job.submit_quote",
  "job.approve_quote",
  "job.reject_quote",
  "job.requote",
  "job.start_repair",
  "job.mark_ready",
  "job.complete",
  "job.cancel",
  "attachment.upload",
];

export function isAuditAction(
  value: string | undefined | null,
): value is AuditAction {
  return !!value && (AUDIT_ACTIONS as string[]).includes(value);
}

/** Asia/Bangkok is UTC+7 with no daylight saving (fixed since 1941). */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a `YYYY-MM-DD` filter value as a wall-clock day in Asia/Bangkok.
 * `endOfDay` yields 23:59:59.999 on that day, otherwise 00:00:00.000.
 * Anything that is not a real calendar date (wrong shape, month 13, Feb 30) → undefined.
 */
export function parseBangkokDate(
  value: string | undefined,
  endOfDay: boolean,
): Date | undefined {
  const match = value ? DATE_ONLY.exec(value.trim()) : null;
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  )
    return undefined;
  const wallClock = endOfDay
    ? Date.UTC(year, month - 1, day, 23, 59, 59, 999)
    : Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  return new Date(wallClock - BANGKOK_OFFSET_MS);
}

export type AuditFilter = {
  action?: AuditAction;
  /** Free text matched against the stored actor label. */
  actor: string;
  /** Exact Job Number; an unknown value yields no rows. */
  jobNo: string;
  /** Inclusive bound of the first Bangkok day. */
  from?: Date;
  /** Inclusive bound of the last Bangkok day (end-of-day). */
  to?: Date;
  page: number;
};

export type AuditSearchParams = {
  action?: string;
  actor?: string;
  jobNo?: string;
  from?: string;
  to?: string;
  page?: string;
};

export function parseAuditFilter(searchParams: AuditSearchParams): AuditFilter {
  const page = Number.parseInt(searchParams.page ?? "", 10);
  return {
    action: isAuditAction(searchParams.action)
      ? searchParams.action
      : undefined,
    actor: searchParams.actor?.trim() ?? "",
    jobNo: searchParams.jobNo?.trim() ?? "",
    from: parseBangkokDate(searchParams.from, false),
    to: parseBangkokDate(searchParams.to, true),
    page: Number.isFinite(page) && page >= 1 ? page : 1,
  };
}

export type AuditWhere = {
  action?: AuditAction;
  actorLabel?: { contains: string };
  jobId?: string;
  at?: { gte?: Date; lte?: Date };
};

/**
 * Build the Prisma `where` for the audit list.
 * A Job Number that does not resolve to an existing job returns `null` so the
 * caller shows an empty result instead of the whole log.
 */
export function buildAuditWhere(
  filter: AuditFilter,
  resolvedJobId: string | undefined,
): AuditWhere | null {
  if (filter.jobNo && !resolvedJobId) return null;
  const at: { gte?: Date; lte?: Date } = {};
  if (filter.from) at.gte = filter.from;
  if (filter.to) at.lte = filter.to;
  return {
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.actor ? { actorLabel: { contains: filter.actor } } : {}),
    ...(filter.jobNo && resolvedJobId ? { jobId: resolvedJobId } : {}),
    ...(filter.from || filter.to ? { at } : {}),
  };
}

/** Parse a stored before/after JSON blob; corrupt data degrades to null, never throws. */
export function parseAuditJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
