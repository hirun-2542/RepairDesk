import { requireUser } from "@/lib/session";
export default async function Jobs(){await requireUser();return <div className="page"><h1>กระดานงาน</h1><p className="muted">ยังไม่มีงานในระบบ</p></div>;}
