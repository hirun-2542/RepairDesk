import Link from "next/link";
export default function NotFound(){return <div className="page"><div className="card empty"><h1>ไม่พบข้อมูล</h1><p>ไม่พบหน้านี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p><Link className="btn btn-primary" href="/jobs">กลับกระดานงาน</Link></div></div>;}
