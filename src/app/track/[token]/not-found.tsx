import { Link2Off } from "lucide-react";
import { TrackHeader } from "@/components/track-ui";

/** Invalid token: same private 404 for every wrong link, revealing nothing about existing jobs. */
export default function TrackNotFound() {
  return (
    <div className="track">
      <TrackHeader />
      <main className="stack" style={{ padding: "0 0 16px" }}>
        <div
          className="card card-pad stack track-card"
          style={{ textAlign: "center", alignItems: "center", padding: 32 }}
        >
          <Link2Off
            size={40}
            aria-hidden
            style={{ color: "var(--slate-500)" }}
          />
          <h1 style={{ fontSize: 20 }}>ไม่พบลิงก์ติดตามงาน</h1>
          <p className="muted small">
            ลิงก์อาจไม่ถูกต้องหรือพิมพ์ผิด กรุณาตรวจสอบจากใบรับงาน
            หรือติดต่อร้านโดยแจ้งเลขที่งาน
          </p>
        </div>
      </main>
    </div>
  );
}
