import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { listJobs } from "@/server/job-service";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/domain/labels";
import type { ItemCategory, JobStatus } from "@/domain/types";
import { StatusBadge, formatDate } from "@/components/job-ui";
import { CategoryIcon } from "@/components/category-icon";

const CATEGORIES: ItemCategory[] = ["PHONE", "COMPUTER", "CAR", "AIRCON"];

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  technicianId?: string;
  page?: string;
};

export default async function JobListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const isTechnician = user.role === "TECHNICIAN";
  const q = sp.q?.trim() || undefined;
  const status = STATUS_ORDER.includes(sp.status as JobStatus)
    ? (sp.status as JobStatus)
    : undefined;
  const category = CATEGORIES.includes(sp.category as ItemCategory)
    ? (sp.category as ItemCategory)
    : undefined;
  const technicianId =
    !isTechnician && sp.technicianId ? sp.technicianId : undefined;
  const requestedPage = Number.parseInt(sp.page ?? "", 10);
  const result = await listJobs(
    {
      q,
      status,
      category,
      technicianId,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    },
    user,
  );
  const technicians = isTechnician
    ? []
    : await prisma.user.findMany({
        where: { role: "TECHNICIAN" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
  const hasFilters = Boolean(q || status || category || technicianId);

  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (technicianId) params.set("technicianId", technicianId);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return "/jobs/list" + (query ? "?" + query : "");
  };

  const first = result.count === 0 ? 0 : (result.page - 1) * 20 + 1;
  const last = Math.min(result.page * 20, result.count);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>รายการงาน</h1>
          <p className="muted small">
            {isTechnician
              ? "เฉพาะงานที่มอบหมายให้คุณ"
              : "ค้นหาและกรองงานทั้งหมด"}
          </p>
        </div>
      </div>
      <div className="card">
        <form
          className="filters"
          role="search"
          action="/jobs/list"
          method="get"
        >
          <div className="field">
            <label htmlFor="q">ค้นหา</label>
            <input
              id="q"
              name="q"
              className="input"
              defaultValue={q ?? ""}
              placeholder="เลขที่งาน, ชื่อลูกค้า, เบอร์โทร, ยี่ห้อ, รุ่น"
            />
          </div>
          <div className="field">
            <label htmlFor="status">สถานะ</label>
            <select
              id="status"
              name="status"
              className="select"
              defaultValue={status ?? ""}
            >
              <option value="">ทั้งหมด</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">ประเภท</label>
            <select
              id="category"
              name="category"
              className="select"
              defaultValue={category ?? ""}
            >
              <option value="">ทั้งหมด</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="technicianId">ช่าง</label>
            {isTechnician ? (
              <select
                id="technicianId"
                className="select"
                defaultValue={user.id}
                disabled
                title="ล็อกเฉพาะงานของคุณ"
              >
                <option value={user.id}>{user.name}</option>
              </select>
            ) : (
              <select
                id="technicianId"
                name="technicianId"
                className="select"
                defaultValue={technicianId ?? ""}
              >
                <option value="">ทั้งหมด</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary">
              ค้นหา
            </button>
            {hasFilters && (
              <Link href="/jobs/list" className="btn btn-ghost">
                ล้างตัวกรอง
              </Link>
            )}
          </div>
        </form>
        {result.jobs.length === 0 ? (
          <div className="empty">
            <div className="ico">
              <SearchX size={20} aria-hidden />
            </div>
            <h3>ไม่พบงานที่ตรงกับเงื่อนไข</h3>
            <p className="small" style={{ maxWidth: 360 }}>
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูงานทั้งหมด
            </p>
            {hasFilters && (
              <Link href="/jobs/list" className="btn btn-secondary">
                ล้างตัวกรอง
              </Link>
            )}
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <caption className="sr-only">รายการงานซ่อม</caption>
              <thead>
                <tr>
                  <th>เลขที่งาน</th>
                  <th>ลูกค้า</th>
                  <th>อุปกรณ์</th>
                  <th>สถานะ</th>
                  <th>ช่าง</th>
                  <th>อัปเดต</th>
                </tr>
              </thead>
              <tbody>
                {result.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={"/jobs/" + job.id} className="strong mono">
                        {job.jobNo}
                      </Link>
                    </td>
                    <td>
                      <div>{job.customer.name}</div>
                      <div className="xs muted">{job.customer.phone}</div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <CategoryIcon c={job.category} />
                        <div>
                          <div>
                            {job.brand} {job.model}
                          </div>
                          <div className="xs muted">
                            {CATEGORY_LABEL[job.category]}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td>
                      {job.technician?.name ?? <span className="muted">—</span>}
                    </td>
                    <td className="muted">{formatDate(job.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <span>
            แสดง {first}–{last} จาก {result.count} งาน
          </span>
          <div className="row">
            {result.page > 1 ? (
              <Link
                href={pageHref(result.page - 1)}
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
              หน้า {result.page}/{result.pages}
            </span>
            {result.page < result.pages ? (
              <Link
                href={pageHref(result.page + 1)}
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
    </div>
  );
}
