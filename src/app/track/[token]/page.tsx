import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptText, TriangleAlert } from "lucide-react";
import { getPublicTracking } from "@/server/tracking-service";
import {
  TrackAttachments,
  TrackHeader,
  TrackProgress,
} from "@/components/track-ui";
import { StatusBadge, formatDate } from "@/components/job-ui";
import { QuoteView } from "@/components/quote-view";
import { CATEGORY_LABEL, METHOD_LABEL } from "@/domain/labels";
import { formatTHB } from "@/domain/money";
import { DecisionBar } from "./decision-bar";

/** A bearer link must always be rendered fresh — never cached or prerendered. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ติดตามงานซ่อม" };

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const job = await getPublicTracking(token);
  if (!job) notFound();

  return (
    <div className="track">
      <TrackHeader jobNo={job.jobNo} />
      <main
        className="stack"
        style={{ padding: "0 0 16px", paddingBottom: job.canDecide ? 88 : 16 }}
      >
        <section
          className="card card-pad stack track-card"
          aria-label="สถานะปัจจุบัน"
        >
          <div className="row between">
            <StatusBadge status={job.status} />
            <span className="small muted">{formatDate(job.updatedAt)}</span>
          </div>
          <p className="strong" style={{ fontSize: 18 }}>
            {job.statusText}
          </p>
          <div className="small muted">
            {CATEGORY_LABEL[job.category]} · {job.brand} {job.model}
          </div>
          {job.status === "CANCELLED" && job.cancelReason && (
            <p className="banner banner-error">{job.cancelReason}</p>
          )}
        </section>

        {job.quote && (
          <section
            className="stack"
            style={{ margin: "0 16px" }}
            aria-label="ใบเสนอราคา"
          >
            {job.canDecide && (
              <p className="banner banner-warn">
                <TriangleAlert size={18} aria-hidden />
                <span>
                  <span className="strong">กรุณาพิจารณาใบเสนอราคา</span>
                  {job.diagnosis ? ` — ช่างตรวจพบ: ${job.diagnosis}` : ""}
                </span>
              </p>
            )}
            <QuoteView quote={job.quote} customer />
          </section>
        )}

        <section
          className="card card-pad"
          style={{ margin: "0 16px" }}
          aria-label="ความคืบหน้า"
        >
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>ความคืบหน้า</h2>
          <TrackProgress status={job.status} timeline={job.timeline} />
        </section>

        {job.attachments.length > 0 && (
          <section
            className="card card-pad"
            style={{ margin: "0 16px" }}
            aria-label="รูปภาพและเอกสาร"
          >
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>รูปภาพและเอกสาร</h2>
            <TrackAttachments attachments={job.attachments} token={job.token} />
          </section>
        )}

        {job.payment && (
          <section
            className="card card-pad"
            style={{ margin: "0 16px" }}
            aria-label="การชำระเงิน"
          >
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>
              <ReceiptText
                size={18}
                aria-hidden
                style={{ verticalAlign: "-4px" }}
              />{" "}
              การชำระเงิน
            </h2>
            <div className="row between">
              <span className="muted">
                {job.payment.kind === "REPAIR" ? "ค่าซ่อม" : "ค่าตรวจเช็ค"} (
                {METHOD_LABEL[job.payment.method]})
              </span>
              <span className="strong mono">
                {formatTHB(job.payment.amount)}
              </span>
            </div>
            <div className="xs muted">
              ชำระเมื่อ {formatDate(job.payment.paidAt)}
            </div>
          </section>
        )}

        <p
          className="xs muted"
          style={{ textAlign: "center", padding: "0 24px" }}
        >
          มีคำถามเกี่ยวกับงานนี้ ติดต่อร้านพร้อมแจ้งเลขที่งาน {job.jobNo}
        </p>
      </main>

      {job.canDecide && job.quote && (
        <DecisionBar
          token={job.token}
          revision={job.revision}
          total={job.quote.total}
        />
      )}
    </div>
  );
}
