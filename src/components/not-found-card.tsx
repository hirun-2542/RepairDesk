import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * Private 404 shown instead of leaking whether a record exists. Rendered inside the staff
 * layout for authenticated-but-unauthorized routes, and standalone for unknown URLs.
 */
export function NotFoundCard() {
  return (
    <div className="page">
      <div className="card empty">
        <div className="ico">
          <SearchX size={24} aria-hidden />
        </div>
        <h1>ไม่พบข้อมูล</h1>
        <p>ไม่พบหน้านี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
        <Link className="btn btn-primary" href="/jobs">
          กลับกระดานงาน
        </Link>
      </div>
    </div>
  );
}
