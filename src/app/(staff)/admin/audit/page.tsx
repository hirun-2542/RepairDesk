import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  SearchX,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AUDIT_LABEL } from "@/domain/labels";
import {
  AUDIT_ACTIONS,
  buildAuditWhere,
  isAuditAction,
  parseAuditFilter,
  parseAuditJson,
} from "@/domain/audit-filter";
import { formatDate } from "@/components/job-ui";

const PAGE_SIZE = 50;

const ACTOR_TAG: Record<string, string> = {
  CUSTOMER: "ลูกค้า",
  ANONYMOUS: "ไม่ระบุตัวตน",
};

type SearchParams = {
  action?: string;
  actor?: string;
  jobNo?: string;
  from?: string;
  to?: string;
  page?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const filter = parseAuditFilter(sp);
  const hasFilters = Boolean(
    filter.action || filter.actor || filter.jobNo || filter.from || filter.to,
  );

  const job = filter.jobNo
    ? await prisma.repairJob.findUnique({
        where: { jobNo: filter.jobNo },
        select: { id: true },
      })
    : null;
  const auditWhere = buildAuditWhere(filter, job?.id);
  const total = auditWhere
    ? await prisma.auditLog.count({ where: auditWhere })
    : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filter.page, pages);
  const entries = auditWhere
    ? await prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: [{ at: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : [];

  const jobIds = [
    ...new Set(
      entries
        .map((entry) => entry.jobId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const jobs = jobIds.length
    ? await prisma.repairJob.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, jobNo: true },
      })
    : [];
  const jobNoById: Record<string, string> = Object.fromEntries(
    jobs.map((job) => [job.id, job.jobNo]),
  );

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (sp.action) params.set("action", sp.action);
    if (filter.actor) params.set("actor", filter.actor);
    if (filter.jobNo) params.set("jobNo", filter.jobNo);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return "/admin/audit" + (query ? "?" + query : "");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Audit Log</h1>
          <p className="muted small">
            บันทึกทุกการเปลี่ยนแปลง — เพิ่มได้อย่างเดียว แก้ไขหรือลบไม่ได้
            (บังคับที่ฐานข้อมูล)
          </p>
        </div>
      </div>

      <div className="card">
        <form
          className="filters filters-6"
          role="search"
          action="/admin/audit"
          method="get"
        >
          <div className="field">
            <label htmlFor="action">การกระทำ</label>
            <select
              id="action"
              name="action"
              className="select"
              defaultValue={filter.action ?? ""}
            >
              <option value="">ทั้งหมด</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_LABEL[action]} ({action})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="actor">ผู้ทำรายการ</label>
            <div className="input-search">
              <Search className="icon" aria-hidden />
              <input
                id="actor"
                name="actor"
                className="input"
                defaultValue={filter.actor}
                placeholder="ชื่อหรือบทบาท"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="jobNo">เลขที่งาน</label>
            <input
              id="jobNo"
              name="jobNo"
              className="input mono"
              defaultValue={filter.jobNo}
              placeholder="RJ-2026-0005"
            />
          </div>
          <div className="field">
            <label htmlFor="from">ตั้งแต่</label>
            <input
              id="from"
              name="from"
              className="input"
              type="date"
              defaultValue={sp.from ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="to">ถึง</label>
            <input
              id="to"
              name="to"
              className="input"
              type="date"
              defaultValue={sp.to ?? ""}
            />
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary">
              ค้นหา
            </button>
            {hasFilters && (
              <Link href="/admin/audit" className="btn btn-ghost">
                ล้าง
              </Link>
            )}
          </div>
        </form>

        {entries.length === 0 ? (
          <div className="empty">
            <div className="ico">
              <SearchX size={20} aria-hidden />
            </div>
            <h3>ไม่พบรายการ Audit</h3>
            <p className="small" style={{ maxWidth: 360 }}>
              ลองปรับตัวกรอง หรือล้างตัวกรองเพื่อดูรายการทั้งหมด
            </p>
            {hasFilters && (
              <Link href="/admin/audit" className="btn btn-secondary">
                ล้างตัวกรอง
              </Link>
            )}
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">
                Audit Log — บันทึกทุกการเปลี่ยนแปลง เรียงใหม่สุดก่อน
              </caption>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ผู้ทำรายการ</th>
                  <th>การกระทำ</th>
                  <th>งาน</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const label = isAuditAction(entry.action)
                    ? AUDIT_LABEL[entry.action]
                    : entry.action;
                  const after = parseAuditJson(entry.after);
                  const onBehalf =
                    !!after &&
                    typeof after === "object" &&
                    "onBehalfOfCustomer" in after;
                  return (
                    <tr key={entry.id}>
                      <td
                        className="mono muted"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {formatDate(entry.at)}
                      </td>
                      <td>
                        <div
                          className="row"
                          style={{ gap: 6, flexWrap: "wrap" }}
                        >
                          <span>{entry.actorLabel}</span>
                          {ACTOR_TAG[entry.actorType] && (
                            <span className="tag">
                              {ACTOR_TAG[entry.actorType]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div
                          className="row"
                          style={{ gap: 6, flexWrap: "wrap" }}
                        >
                          <span className="strong">{label}</span>
                          {onBehalf && <span className="tag">แทนลูกค้า</span>}
                        </div>
                        <div className="xs muted mono">{entry.action}</div>
                      </td>
                      <td className="mono" style={{ whiteSpace: "nowrap" }}>
                        {entry.jobId ? (jobNoById[entry.jobId] ?? "—") : "—"}
                      </td>
                      <td>
                        {entry.before || entry.after ? (
                          <details>
                            <summary className="small">
                              ก่อน/หลัง{" "}
                              <ChevronDown className="icon" aria-hidden />
                            </summary>
                            <div className="audit-json">
                              <div>
                                <div className="xs muted">ก่อน</div>
                                <pre className="json">
                                  {JSON.stringify(
                                    parseAuditJson(entry.before) ?? null,
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                              <div>
                                <div className="xs muted">หลัง</div>
                                <pre className="json">
                                  {JSON.stringify(
                                    parseAuditJson(entry.after) ?? null,
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                            </div>
                          </details>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pager">
          <span>
            แสดง {first}–{last} จาก {total} รายการ
          </span>
          <div className="row">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} aria-hidden />
                ก่อนหน้า
              </Link>
            ) : (
              <span className="btn btn-secondary btn-sm" aria-disabled="true">
                <ChevronLeft size={16} aria-hidden />
                ก่อนหน้า
              </span>
            )}
            <span>
              หน้า {page}/{pages}
            </span>
            {page < pages ? (
              <Link
                href={pageHref(page + 1)}
                className="btn btn-secondary btn-sm"
              >
                ถัดไป
                <ChevronRight size={16} aria-hidden />
              </Link>
            ) : (
              <span className="btn btn-secondary btn-sm" aria-disabled="true">
                ถัดไป
                <ChevronRight size={16} aria-hidden />
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="banner banner-info"
        role="status"
        style={{ marginTop: 16 }}
      >
        <Info className="icon-lg" aria-hidden />
        <div>
          <div className="strong">Audit Log เป็น append-only</div>
          <div>
            ไม่มีปุ่มหรือเส้นทางแก้ไข/ลบรายการ และฐานข้อมูลปฏิเสธคำสั่ง
            UPDATE/DELETE ที่ตาราง AuditLog
          </div>
        </div>
      </div>
    </div>
  );
}
