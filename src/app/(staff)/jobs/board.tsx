import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER } from "@/domain/labels";
import type { ItemCategory, JobStatus } from "@/domain/types";
import { STATUS_ICON, formatDate, formatRelativeAge } from "@/components/job-ui";
import { CategoryIcon } from "@/components/category-icon";

export type BoardJob = {
  id: string;
  jobNo: string;
  status: JobStatus;
  category: ItemCategory;
  brand: string;
  model: string;
  updatedAt: Date;
  customer: { name: string };
  technician: { name: string } | null;
};

export function JobBoard({ jobs, role }: { jobs: BoardJob[]; role: string }) {
  const isTechnician = role === "TECHNICIAN";
  // Stat tiles: open work, awaiting customer approval, in repair, ready/awaiting payment.
  const tiles = [
    {
      label: "งานค้างทั้งหมด",
      status: "RECEIVED" as JobStatus,
      value: jobs.filter(
        (j) => j.status !== "COMPLETED" && j.status !== "CANCELLED",
      ).length,
    },
    {
      label: "รอลูกค้าอนุมัติราคา",
      status: "QUOTED" as JobStatus,
      value: jobs.filter((j) => j.status === "QUOTED").length,
    },
    {
      label: "กำลังซ่อม",
      status: "REPAIRING" as JobStatus,
      value: jobs.filter((j) => j.status === "REPAIRING").length,
    },
    {
      label: "รอชำระ/รับเครื่อง",
      status: "READY_FOR_PICKUP" as JobStatus,
      value: jobs.filter((j) => j.status === "READY_FOR_PICKUP").length,
    },
  ];
  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <h1>กระดานงาน</h1>
          <p className="muted small">
            {isTechnician
              ? "เฉพาะงานที่มอบหมายให้คุณ"
              : "ภาพรวมงานทุกสถานะ (ดูอย่างเดียว — เปลี่ยนสถานะที่หน้ารายละเอียดงาน)"}
          </p>
        </div>
        {!isTechnician && (
          <Link href="/jobs/new" className="btn btn-primary btn-lg">
            <Plus size={16} aria-hidden />
            รับงานใหม่
          </Link>
        )}
      </div>
      <div
        className="grid-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          marginBottom: 20,
        }}
      >
        {tiles.map(({ label, status, value }) => {
          const Icon = STATUS_ICON[status];
          return (
            <div key={label} className="card card-pad row">
              <span className={"catico st-" + status}>
                <Icon size={16} aria-hidden />
              </span>
              <div>
                <div className="small muted">{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
                  {value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="board" role="list" aria-label="กระดานงานตามสถานะ">
        {STATUS_ORDER.map((status) => {
          const Icon = STATUS_ICON[status];
          const cards = jobs.filter((j) => j.status === status);
          return (
            <section
              key={status}
              className="col"
              role="listitem"
              aria-label={`${STATUS_LABEL[status]} ${cards.length} งาน`}
            >
              <h2 className="col-head">
                <Icon className={"icon dot-" + status} aria-hidden />
                {STATUS_LABEL[status]}
                <span className="col-count">{cards.length}</span>
              </h2>
              {cards.length === 0 ? (
                <div className="col-empty">ไม่มีงานในสถานะนี้</div>
              ) : (
                cards.map((job) => (
                  <Link
                    key={job.id}
                    href={"/jobs/" + job.id}
                    className="jobcard"
                  >
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <span className="jn mono">{job.jobNo}</span>
                      <CategoryIcon c={job.category} />
                    </div>
                    <div className="small strong">
                      {job.brand} {job.model}
                    </div>
                    <div className="small muted">{job.customer.name}</div>
                    <div
                      className="meta"
                      style={{ marginTop: 8, justifyContent: "space-between" }}
                    >
                      <span
                        style={
                          job.technician
                            ? undefined
                            : { color: "var(--warning)" }
                        }
                      >
                        {job.technician?.name ?? "ยังไม่มอบหมาย"}
                      </span>
                      <span title={formatDate(job.updatedAt)}>
                        {formatRelativeAge(job.updatedAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </section>
          );
        })}
      </div>
      {jobs.length === 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="empty">
            <div className="ico">
              <SearchX size={20} aria-hidden />
            </div>
            <h3>
              {isTechnician
                ? "ยังไม่มีงานที่มอบหมายให้คุณ"
                : "ยังไม่มีงานในระบบ"}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div
      className="page page-wide"
      aria-busy="true"
      aria-label="กำลังโหลดกระดานงาน"
    >
      <div className="page-head">
        <div>
          <div className="skel" style={{ width: 180, height: 26 }} />
          <div
            className="skel"
            style={{ width: 300, height: 16, marginTop: 10 }}
          />
        </div>
      </div>
      <div
        className="grid-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          marginBottom: 20,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card card-pad row">
            <div
              className="skel"
              style={{ width: 28, height: 28, borderRadius: "var(--r-md)" }}
            />
            <div style={{ flex: 1 }}>
              <div className="skel" style={{ width: "60%", height: 12 }} />
              <div
                className="skel"
                style={{ width: "35%", height: 22, marginTop: 8 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="board">
        {STATUS_ORDER.map((status) => (
          <section key={status} className="col">
            <div className="col-head">
              <span className="skel" style={{ width: 110, height: 16 }} />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="jobcard">
                <div className="skel" style={{ width: "55%", height: 14 }} />
                <div
                  className="skel"
                  style={{ width: "75%", height: 12, marginTop: 8 }}
                />
                <div
                  className="skel"
                  style={{ width: "45%", height: 12, marginTop: 6 }}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
