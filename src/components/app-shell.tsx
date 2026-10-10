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
import { ROLE_LABEL } from "@/domain/labels";
import type { Role } from "@/domain/types";
export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const jobLinks = [
    { href: "/jobs", label: "กระดานงาน", icon: LayoutDashboard },
    { href: "/jobs/list", label: "รายการงาน", icon: List },
    ...(user.role === "TECHNICIAN"
      ? []
      : [{ href: "/jobs/new", label: "รับงานใหม่", icon: PlusCircle }]),
  ];
  const adminLinks = [
    { href: "/admin/users", label: "ผู้ใช้", icon: UserCog },
    { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  ];
  const renderLink = (item: (typeof jobLinks)[number]) => (
    <Link
      href={item.href}
      key={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={path === item.href ? "page" : undefined}
    >
      <item.icon size={20} />
      <span className="navlabel">{item.label}</span>
    </Link>
  );
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
          {jobLinks.map(renderLink)}
          {user.role === "ADMIN" && (
            <>
              <div className="nav-group">ผู้ดูแลระบบ</div>
              {adminLinks.map(renderLink)}
            </>
          )}
        </nav>
        <div className="side-user">
          <span className="avatar">{user.name[0]}</span>
          <div className="who">
            <span>{user.name}</span>
            <span className="rolepill">{ROLE_LABEL[user.role]}</span>
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
