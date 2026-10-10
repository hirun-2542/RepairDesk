import { Check, FileText, ShieldCheck, Wrench } from "lucide-react";
import { STATUS_ICON, formatDate } from "@/components/job-ui";
import { MAIN_FLOW, STAGE_LABEL, STATUS_LABEL } from "@/domain/labels";
import type { JobStatus } from "@/domain/types";
import type { PublicAttachment, PublicTimelineEntry } from "@/server/tracking-service";

/** Navy header of the public tracking page. Without a job number it is the private "link not found" shell. */
export function TrackHeader({ jobNo }: { jobNo?: string }) {
  if (!jobNo) {
    return (
      <header className="track-top">
        <div className="brand" style={{ justifyContent: "center" }}>RepairDesk</div>
      </header>
    );
  }
  return (
    <header className="track-top">
      <div className="row between">
        <div className="brand">
          <span className="brand-mark"><Wrench size={18} aria-hidden /></span>RepairDesk
        </div>
        <span className="small row" style={{ gap: 4, color: "#bae6fd" }}>
          <ShieldCheck size={16} aria-hidden />ลิงก์ส่วนตัว
        </span>
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="small" style={{ color: "#bae6fd" }}>ติดตามงานซ่อม</div>
        <h1 className="mono" style={{ color: "#fff" }}>{jobNo}</h1>
      </div>
    </header>
  );
}

/** Vertical progress list: date + status label only (no actor, no before/after). */
export function TrackProgress({ status, timeline }: { status: JobStatus; timeline: PublicTimelineEntry[] }) {
  const cancelled = status === "CANCELLED";
  const steps: JobStatus[] = cancelled ? ["RECEIVED", "CANCELLED"] : MAIN_FLOW;
  const currentIndex = cancelled ? steps.length - 1 : MAIN_FLOW.indexOf(status);
  return (
    <ol className="vstep">
      {steps.map((step, index) => {
        const state = cancelled ? (step === "CANCELLED" ? "cur" : "done") : index < currentIndex ? "done" : index === currentIndex ? "cur" : "todo";
        const Icon = STATUS_ICON[step];
        const at = [...timeline].reverse().find((entry) => entry.status === step)?.at;
        return (
          <li key={step} className={state} aria-current={state === "cur" ? "step" : undefined}>
            <span className="node">
              {state === "done" ? <Check size={14} aria-hidden /> : <Icon size={14} aria-hidden />}
            </span>
            <div>
              <div className={state === "cur" ? "strong" : ""}>{STATUS_LABEL[step]}</div>
              {at && <div className="xs muted">{formatDate(at)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Attachment thumbnails reachable only through the tracking token; PAYMENT_SLIP is filtered out server-side. */
export function TrackAttachments({ attachments, token }: { attachments: PublicAttachment[]; token: string }) {
  if (attachments.length === 0) return null;
  return (
    <div className="thumbs" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
      {attachments.map((file) => {
        const href = `/files/${file.id}?t=${encodeURIComponent(token)}`;
        return (
          <figure className="thumb" key={file.id} style={{ margin: 0 }}>
            {file.mimeType === "application/pdf" ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`เปิดไฟล์ PDF ${file.fileName}`}
                style={{ display: "grid", placeItems: "center", height: 76, color: "var(--fg-muted)" }}
              >
                <FileText size={28} aria-hidden />
              </a>
            ) : (
              <a href={href} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={href} alt={file.fileName} style={{ display: "block", width: "100%", height: 76, objectFit: "cover" }} />
              </a>
            )}
            <figcaption className="cap">
              <span className="strong" style={{ color: "var(--fg)" }}>{STAGE_LABEL[file.stage]}</span>
              <br />
              {file.fileName}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
