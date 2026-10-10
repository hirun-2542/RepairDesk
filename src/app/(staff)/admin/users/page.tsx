import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireUser(["ADMIN"]);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } });
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="muted small">สร้างบัญชีพนักงาน เปลี่ยนบทบาท และปิดใช้งาน — มีผลทันทีในคำขอถัดไป</p>
        </div>
      </div>
      <UsersManager users={users} meId={me.id} />
    </div>
  );
}
