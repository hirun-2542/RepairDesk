import { SearchX } from "lucide-react";
import { EmptyState } from "../components/ui";
import { Link } from "../lib/router";

export function NotFound({ text = "ไม่พบหน้านี้ หรือคุณไม่มีสิทธิ์เข้าถึง" }: { text?: string }) {
  return <div className="page"><div className="card"><EmptyState icon={SearchX} title="ไม่พบข้อมูล" action={<Link className="btn btn-primary" to="/jobs">กลับกระดานงาน</Link>}>{text}</EmptyState></div></div>;
}
