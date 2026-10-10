"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wrench,
  LayoutDashboard,
  List,
  PlusCircle,
  UserCog,
  ScrollText,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
const roles: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  FRONT_DESK: "หน้าร้าน",
  TECHNICIAN: "ช่าง",
};
export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const links = [
    { href: "/jobs", label: "กระดานงาน", icon: LayoutDashboard, show: true },
    { href: "/jobs/list", label: "รายการงาน", icon: List, show: true },
    {
      href: "/jobs/new",
      label: "รับงานใหม่",
      icon: PlusCircle,
      show: user.role !== "TECHNICIAN",
    },
    {
      href: "/admin/users",
      label: "ผู้ใช้",
      icon: UserCog,
      show: user.role === "ADMIN",
    },
    {
      href: "/admin/audit",
      label: "Audit Log",
      icon: ScrollText,
      show: user.role === "ADMIN",
    },
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/jobs" className="brand" title="RepairDesk">
          <span className="brand-mark">
            <Wrench size={20} />
          </span>
          <span className="brand-text">RepairDesk</span>
        </Link>
        <nav className="side-nav" aria-label="เมนูหลัก">
          <div className="nav-group">งานซ่อม</div>
          {links
            .filter((x) => x.show)
            .map((x) => (
              <Link
                href={x.href}
                key={x.href}
                title={x.label}
                aria-label={x.label}
                aria-current={path === x.href ? "page" : undefined}
              >
                <x.icon size={20} />
                <span className="navlabel">{x.label}</span>
              </Link>
            ))}
        </nav>
        <div className="side-user">
          <span className="avatar">{user.name[0]}</span>
          <div className="who">
            <span>{user.name}</span>
            <span className="rolepill">{roles[user.role]}</span>
          </div>
          <form action={logoutAction}>
            <button
              className="iconbtn"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
