"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Search,
  ClipboardList,
  ChartNoAxesColumnIncreasing,
  FolderOpen,
  HelpCircle,
  ArrowUpRight,
  Bell,
  Menu,
  X,
  LogOut,
  Users,
  GraduationCap,
  Inbox,
  MessageSquare,
  Settings,
  ChevronRight,
} from "lucide-react";
import { authClient } from "@/lib/auth/client";
const studentNav = [
  ["/students", "Overview", LayoutDashboard],
  ["/students/my-courses", "My courses", BookOpen],
  ["/students/catalogue", "Course catalogue", Search],
  ["/students/assessments", "Assessments", ClipboardList],
  ["/students/lln", "LLN & readiness", ChartNoAxesColumnIncreasing],
  ["/students/resources", "Student resources", FolderOpen],
] as const;
const adminNav = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/students", "Students", Users],
  ["/admin/applications", "Applications", Inbox],
  ["/admin/courses", "Courses & content", BookOpen],
  ["/admin/assessments", "Assessment review", ClipboardList],
  ["/admin/enrollments", "Enrolments", GraduationCap],
  ["/admin/feedback", "Student feedback", MessageSquare],
  ["/admin/import", "Import & export", FolderOpen],
] as const;
export function Shell({
  children,
  user,
  unread = 0,
  admin = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string } | null;
  unread?: number;
  admin?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = admin ? adminNav : studentNav;
  const current =
    nav.find(([href]) => path === href)?.[1] ||
    (path.includes("catalogue")
      ? "Course details"
      : path.includes("learn")
        ? "Learning workspace"
        : path.includes("profile")
          ? "My profile"
          : path.includes("notifications")
            ? "Notifications"
            : path.includes("support")
              ? "Help & support"
              : "Workspace");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {open && (
        <button
          className="nav-scrim"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link
          href={admin ? "/admin" : "/students"}
          className="brand"
          onClick={() => setOpen(false)}
        >
          <img src="/images/logo.png" alt="Level Up Academy" />
        </Link>
        <div className="sidebar-label">
          {admin ? "STAFF WORKSPACE" : "YOUR STUDENT SPACE"}
        </div>
        <nav aria-label={admin ? "Staff navigation" : "Student navigation"}>
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`nav-item ${(href === (admin ? "/admin" : "/students") ? path === href : path.startsWith(href)) ? "active" : ""}`}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {path === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-callout">
            <span className="support-mark">
              <HelpCircle size={21} />
            </span>
            <h4>
              A little support.
              <br />A big difference.
            </h4>
            <Link href="/students/support" onClick={() => setOpen(false)}>
              We’re here for you <ArrowUpRight size={16} />
            </Link>
          </div>
          {user?.role === "admin" && (
            <Link className="nav-item" href={admin ? "/students" : "/admin"}>
              <Settings size={18} />
              {admin ? "Student view" : "Staff workspace"}
            </Link>
          )}
          <a
            className="nav-item"
            href="https://www.levelupacademy.vic.edu.au/"
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight size={18} />
            Academy website
          </a>
          <Link
            className="profile-link"
            href={user ? "/students/profile" : "/auth/sign-in"}
          >
            <span className="avatar">
              {user
                ? user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                : "LU"}
            </span>
            <span>
              <strong>{user?.name || "Welcome to Level Up"}</strong>
              <small>
                {user
                  ? admin
                    ? "Administrator"
                    : "Student"
                  : "Sign in to your portal"}
              </small>
            </span>
            <ChevronRight size={15} />
          </Link>
          {user && (
            <button
              className="signout"
              onClick={async () => {
                await authClient.signOut();
                router.push("/auth/sign-in");
                router.refresh();
              }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div className="breadcrumb">
            <span>{admin ? "Staff portal" : "Student portal"}</span>
            <ChevronRight size={13} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <form action="/students/catalogue" className="top-search">
              <Search size={16} />
              <input
                name="q"
                placeholder="Find a course…"
                aria-label="Search courses"
              />
              <kbd>↵</kbd>
            </form>
            {user ? (
              <>
                <Link
                  href={user ? "/students/notifications" : "/auth/sign-in"}
                  className="icon-button notification-link"
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                >
                  <Bell size={20} />
                  {unread > 0 && <span />}
                </Link>
                <Link
                  href={user ? "/students/profile" : "/auth/sign-in"}
                  className="avatar small"
                  aria-label="Your account"
                >
                  {user?.name[0] || "LU"}
                </Link>
              </>
            ) : (
              <Link className="button small" href="/auth/sign-in">
                Sign in
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          <span>Made for your next chapter.</span>
          <a href="https://www.levelupacademy.vic.edu.au/">
            Level Up Academy <ArrowUpRight size={12} />
          </a>
          <span className="footer-location">Melbourne, Australia</span>
        </footer>
      </div>
    </div>
  );
}
