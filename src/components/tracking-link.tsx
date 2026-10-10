"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

/**
 * Staff control that copies the customer's tracking link (full URL including origin).
 * `data-testid="tracking-link"` holds the full URL as the input value after hydration.
 */
export function TrackingLink({ token }: { token: string }) {
  const [url, setUrl] = useState(`/track/${token}`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/track/${token}`);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/track/${token}`,
      );
      toast.success("คัดลอกลิงก์ติดตามงานแล้ว");
    } catch {
      inputRef.current?.select();
      toast.error("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  }

  return (
    <div className="row wrap" style={{ gap: 8 }}>
      <input
        ref={inputRef}
        data-testid="tracking-link"
        aria-label="ลิงก์ติดตามงานสำหรับลูกค้า"
        className="input"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        style={{ flex: "1 1 180px", minWidth: 0, maxWidth: 300, fontSize: 12 }}
      />
      <button type="button" className="btn btn-secondary" onClick={copy}>
        <Copy size={16} aria-hidden />
        คัดลอกลิงก์ติดตามงาน
      </button>
    </div>
  );
}
