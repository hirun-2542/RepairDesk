"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Paperclip, Upload } from "lucide-react";
import { STAGE_LABEL } from "@/domain/labels";
import type { AttachmentStage } from "@/domain/types";

export type AttachmentView = {
  id: string;
  stage: AttachmentStage;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date | string;
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}

function Thumb({ attachment }: { attachment: AttachmentView }) {
  const href = `/files/${attachment.id}`;
  return (
    <figure className="thumb" style={{ margin: 0 }}>
      {attachment.mimeType === "application/pdf" ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`เปิดไฟล์ PDF ${attachment.fileName}`}
          style={{
            display: "grid",
            placeItems: "center",
            height: 76,
            color: "var(--fg-muted)",
          }}
        >
          <FileText size={28} aria-hidden />
        </a>
      ) : (
        <a href={href} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={attachment.fileName}
            style={{
              display: "block",
              width: "100%",
              height: 76,
              objectFit: "cover",
            }}
          />
        </a>
      )}
      <figcaption className="cap">
        <span className="strong" style={{ color: "var(--fg)" }}>
          {STAGE_LABEL[attachment.stage]}
        </span>
        <br />
        {attachment.fileName} · {formatSize(attachment.size)}
      </figcaption>
    </figure>
  );
}

export function Attachments({
  jobId,
  attachments,
  stages,
}: {
  jobId: string;
  attachments: AttachmentView[];
  stages: AttachmentStage[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<AttachmentStage | "">(stages[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [over, setOver] = useState(false);
  const selectedStage = (stage || stages[0]) as AttachmentStage | undefined;

  function upload(file: File) {
    if (!selectedStage) return;
    const form = new FormData();
    form.append("file", file);
    form.append("stage", selectedStage);
    setBusy(true);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/jobs/${jobId}/attachments`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setBusy(false);
      let body: { error?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText) as { error?: string };
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        toast.success("แนบไฟล์เรียบร้อย");
        router.refresh();
      } else {
        toast.error(body?.error ?? "อัปโหลดไม่สำเร็จ");
      }
    };
    xhr.onerror = () => {
      setBusy(false);
      toast.error("อัปโหลดไม่สำเร็จ");
    };
    xhr.send(form);
  }

  const stageOrder = Object.keys(STAGE_LABEL) as AttachmentStage[];

  return (
    <div className="card">
      <div className="card-head">
        <h2>
          <Paperclip size={18} aria-hidden /> ไฟล์แนบ
        </h2>
        <span className="small muted">{attachments.length} ไฟล์</span>
      </div>
      <div className="card-pad stack">
        {attachments.length === 0 ? (
          <p className="muted small">ยังไม่มีไฟล์แนบ</p>
        ) : (
          stageOrder.map((stageKey) => {
            const files = attachments.filter((a) => a.stage === stageKey);
            if (files.length === 0) return null;
            return (
              <div key={stageKey}>
                <div className="label" style={{ marginBottom: 6 }}>
                  {STAGE_LABEL[stageKey]}
                </div>
                <div className="thumbs">
                  {files.map((a) => (
                    <Thumb key={a.id} attachment={a} />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {stages.length > 0 ? (
          <div
            className="stack-sm"
            style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
          >
            <div className="field">
              <label htmlFor="attachment-stage">แนบเป็นขั้นตอน</label>
              <select
                id="attachment-stage"
                data-testid="stage-select"
                className="select"
                value={selectedStage}
                disabled={busy}
                onChange={(event) =>
                  setStage(event.target.value as AttachmentStage)
                }
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={"dropzone" + (over ? " over" : "")}
              aria-busy={busy}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) upload(file);
              }}
            >
              {busy ? (
                <div className="stack-sm" aria-busy="true">
                  <span>กำลังอัปโหลด…</span>
                  <div className="progress">
                    <i style={{ width: progress + "%" }} />
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={22} aria-hidden />
                  <div>
                    ลากไฟล์มาวางที่นี่ หรือ{" "}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => inputRef.current?.click()}
                    >
                      เลือกไฟล์
                    </button>
                  </div>
                  <div className="xs">JPG, PNG, WEBP, PDF · ไม่เกิน 10 MB</div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                hidden
                data-testid="file-input"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload(file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        ) : (
          <p className="xs muted">ไม่สามารถแนบไฟล์ในบทบาทหรือสถานะงานนี้ได้</p>
        )}
      </div>
    </div>
  );
}
