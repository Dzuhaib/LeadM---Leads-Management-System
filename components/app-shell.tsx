"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ContactRound,
  Images,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareReply,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShellUser = {
  fullName: string;
  email: string;
  role: "admin" | "employee";
  avatarUrl?: string | null;
};

const SIDEBAR_KEY = "leadm.sidebar.collapsed";
const SIDEBAR_EVENT = "leadm:sidebar";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function getSidebarSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot() {
  return false;
}

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/posts", label: "Social posts", icon: Images },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const adminNav = [
  { href: "/admin", label: "Team overview", icon: ShieldCheck },
  { href: "/admin/replies", label: "Replies", icon: MessageSquareReply },
  { href: "/admin/employees", label: "Employees", icon: UserCog },
  { href: "/admin/leads", label: "Team leads", icon: Users },
  { href: "/admin/posts", label: "Team posts", icon: Images },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const collapsed = React.useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  function toggleSidebar() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      // The sidebar still works when storage is unavailable.
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  const nav = user.role === "admin" ? [...employeeNav, ...adminNav] : employeeNav;
  const home = user.role === "admin" ? "/admin" : "/dashboard";

  function renderNav(compact: boolean) {
    return (
      <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              title={compact ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                compact ? "justify-center py-1.5" : "gap-3 px-2 py-1.5",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "nav-icon-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  active && "nav-icon-3d-active",
                )}
              >
                <item.icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </span>
              {compact ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-sidebar p-3 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center py-2",
            collapsed ? "justify-center" : "px-2",
          )}
        >
          <Logo
            href={home}
            showText={!collapsed}
            size={collapsed ? 38 : 34}
          />
        </div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {renderNav(collapsed)}
        </div>
        <div className="space-y-2">
          <Link
            href="/privacy"
            title={collapsed ? "Privacy & messaging rules" : undefined}
            className={cn(
              "flex items-center rounded-lg text-xs text-muted-foreground",
              collapsed
                ? "justify-center py-2"
                : "gap-2 px-3 py-1.5",
            )}
          >
            <LockKeyhole className="h-4 w-4 shrink-0" />
            {collapsed ? (
              <span className="sr-only">Privacy & messaging rules</span>
            ) : (
              <span>Privacy &amp; messaging rules</span>
            )}
          </Link>
          <UserMenu {...user} collapsed={collapsed} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-sidebar p-4">
            <div className="flex items-center justify-between px-2 py-2">
              <Logo href={home} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-6 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              {renderNav(false)}
            </div>
            <Link
              href="/privacy"
              className="mb-3 flex items-center gap-2 px-3 text-xs text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <LockKeyhole className="h-4 w-4" />
              Privacy &amp; messaging rules
            </Link>
            <UserMenu {...user} />
          </div>
        </div>
      ) : null}

      <div className={collapsed ? "lg:pl-20" : "lg:pl-64"}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              aria-label={
                collapsed ? "Expand navigation drawer" : "Collapse navigation drawer"
              }
              title={collapsed ? "Expand menu" : "Collapse menu"}
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            <div className="lg:hidden">
              <Logo href={home} showText={false} />
            </div>
            <Logo
              href={home}
              showText={false}
              size={24}
              className="hidden lg:inline-flex"
            />
            <span className="hidden text-sm font-medium text-muted-foreground sm:block">
              Lead outreach workspace
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
