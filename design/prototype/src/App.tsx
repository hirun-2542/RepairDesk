import { Fragment, useEffect, type ReactNode } from "react";
import { LayoutDashboard, List as ListIcon, LogOut, PlusCircle, ScrollText, UserCog, Wrench } from "lucide-react";
import { Toasts } from "./components/ui";
import { DEMO_LOGINS } from "./data/mock";
import { ROLE_LABEL } from "./domain/labels";
import { go, Link, useRoute } from "./lib/router";
import { Audit, Users } from "./screens/Admin";
import { Board } from "./screens/Board";
import { DesignSystem } from "./screens/DesignSystem";
import { JobDetail } from "./screens/JobDetail";
import { List } from "./screens/List";
import { Login } from "./screens/Login";
import { NotFound } from "./screens/Misc";
import { NewJob } from "./screens/NewJob";
import { Receipt } from "./screens/Receipt";
import { States } from "./screens/States";
import { Track } from "./screens/Track";
import { useStore } from "./store";

function Shell({ children, path, dock }: { children: ReactNode; path: string; dock: boolean }) {
  const { me, logout } = useStore();
  const groups = [
    { title: "งานซ่อม", show: !!me, items: [
      { to: "/jobs", label: "กระดานงาน", I: LayoutDashboard, show: true, active: path === "/jobs" },
      { to: "/jobs/list", label: "รายการงาน", I: ListIcon, show: true, active: path === "/jobs/list" },
      { to: "/jobs/new", label: "รับงานใหม่", I: PlusCircle, show: me?.role !== "TECHNICIAN", active: path === "/jobs/new" },
    ] },
    { title: "ผู้ดูแลระบบ", show: me?.role === "ADMIN", items: [
      { to: "/admin/users", label: "ผู้ใช้", I: UserCog, show: true, active: path.startsWith("/admin/users") },
      { to: "/admin/audit", label: "Audit Log", I: ScrollText, show: true, active: path.startsWith("/admin/audit") },
    ] },
  ];
  return (
    <div className={`app ${dock ? "has-dock" : ""}`}>
      <aside className="sidebar">
        <Link to="/jobs" className="brand" title="RepairDesk"><span className="brand-mark"><Wrench className="icon-lg" aria-hidden /></span><span className="brand-text">RepairDesk</span></Link>
        <nav className="side-nav" aria-label="เมนูหลัก">
          {groups.filter((g) => g.show).map((g) => (
            <Fragment key={g.title}>
              <div className="nav-group">{g.title}</div>
              {g.items.filter((i) => i.show).map((i) => (
                <Link key={i.to} to={i.to} title={i.label} aria-label={i.label} aria-current={i.active ? "page" : undefined}><i.I className="icon-lg" aria-hidden /><span className="navlabel">{i.label}</span></Link>
              ))}
            </Fragment>
          ))}
        </nav>
        {me && (
          <div className="side-user">
            <span className="avatar" aria-hidden>{me.name[0]}</span>
            <div className="who"><span>{me.name}</span><span className="rolepill">{ROLE_LABEL[me.role]}</span></div>
            <button className="iconbtn" style={{ color: "#cbd5e1" }} onClick={() => { logout(); go("/login"); }} aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut className="icon-lg" /></button>
          </div>
        )}
      </aside>
      <div className={`main ${dock ? "pad-bottom" : ""}`}>{children}</div>
    </div>
  );
}

export default function App({ dock }: { dock: boolean }) {
  const { path, query } = useRoute();
  const s = useStore();
  const as = query.get("as");
  useEffect(() => { const d = DEMO_LOGINS.find((x) => x.key === as); if (d && s.me?.id !== d.userId) s.login(d.userId); }, [as]); // eslint-disable-line
  const staff = !path.startsWith("/login") && !path.startsWith("/track") && path !== "/states" && path !== "/design-system";
  useEffect(() => { if (staff && !s.me && !as) go("/login"); }, [staff, s.me, as]); // eslint-disable-line

  let view: ReactNode;
  const seg = path.split("/").filter(Boolean);
  if (path.startsWith("/login")) view = <Login inactive={query.get("inactive") === "1"} error={query.get("error") === "1"} />;
  else if (seg[0] === "track") view = <Track token={seg[1] ?? ""} />;
  else if (path === "/states") view = <Shell path={path} dock={dock}><States /></Shell>;
  else if (path === "/design-system") view = <Shell path={path} dock={dock}><DesignSystem /></Shell>;
  else if (!s.me) view = null;
  else {
    let page: ReactNode = <NotFound />;
    if (path === "/jobs") page = <Board loading={query.get("state") === "loading"} />;
    else if (path === "/jobs/list") page = <List initialQ={query.get("q") ?? ""} loading={query.get("state") === "loading"} />;
    else if (path === "/jobs/new") page = s.me.role === "TECHNICIAN" ? <NotFound /> : <NewJob prefill={query.get("prefill") === "1"} />;
    else if (seg[0] === "jobs" && seg[2] === "receipt") page = <Receipt id={seg[1]} />;
    else if (seg[0] === "jobs" && seg.length === 2) page = <JobDetail key={seg[1]} id={seg[1]} dialog={query.get("dialog")} />;
    else if (path === "/admin/users") page = s.me.role === "ADMIN" ? <Users /> : <NotFound />;
    else if (path === "/admin/audit") page = s.me.role === "ADMIN" ? <Audit initialAction={query.get("action") ?? ""} /> : <NotFound />;
    view = <Shell path={path} dock={dock}>{page}</Shell>;
  }
  return (
    <>
      {view}
      <Toasts />
      {dock && (
        <div className="dock" role="toolbar" aria-label="Prototype controls">
          <strong>Prototype</strong><span>บทบาท:</span>
          {DEMO_LOGINS.map((d) => <button key={d.key} aria-pressed={s.me?.id === d.userId} onClick={() => { s.login(d.userId); if (!staff) go("/jobs"); }}>{d.label}</button>)}
          <span>|</span>
          <a href="#/login">Login</a><a href="#/jobs">Board</a><a href="#/jobs/list">List</a><a href="#/jobs/new">New</a><a href="#/jobs/j5">Job</a><a href="#/jobs/j5/receipt">Receipt</a><a href="#/track/tk05Z8qLm4VnR2xYc7Hb1PdKfS9aW3">Customer</a><a href="#/admin/users">Users</a><a href="#/admin/audit">Audit</a><a href="#/states">States</a><a href="#/design-system">Design System</a>
        </div>
      )}
    </>
  );
}
