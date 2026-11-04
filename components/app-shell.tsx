"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  MessageSquareReply,
  MessageSquareText,
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

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const adminNav = [
  { href: "/admin", label: "Team overview", icon: ShieldCheck },
  { href: "/admin/replies", label: "Replies", icon: MessageSquareReply },
  { href: "/admin/employees", label: "Employees", icon: UserCog },
  { href: "/admin/leads", label: "Team leads", icon: Users },
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

  const nav = user.role === "admin" ? [...employeeNav, ...adminNav] : employeeNav;
  const home = user.role === "admin" ? "/admin" : "/dashboard";

  const navList = (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
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
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo href={home} />
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">{navList}</div>
        <div className="space-y-3">
          <Link
            href="/privacy"
            className="block px-3 text-xs text-muted-foreground"
          >
            Privacy &amp; messaging rules
          </Link>
          <UserMenu {...user} />
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
            <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
              {navList}
            </div>
            <Link
              href="/privacy"
              className="mb-3 px-3 text-xs text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Privacy &amp; messaging rules
            </Link>
            <UserMenu {...user} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
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
