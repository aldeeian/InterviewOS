"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessagesSquare, Radio, Sparkles, UploadCloud } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/intake", label: "Analyze", icon: UploadCloud },
  { href: "/interview/new", label: "Practice", icon: MessagesSquare },
  { href: "/live-copilot", label: "Live Copilot", icon: Radio },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <Link href="/" className="flex items-center gap-2 px-6 py-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">
            Interview<span className="font-departure text-primary">OS</span>
          </span>
        </Link>
        <span className="kicker px-6 pt-2 pb-2">[ Menu ]</span>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border border-primary/25 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between px-6 py-4">
          <span className="kicker">Local &amp; private</span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              Interview<span className="font-departure text-primary">OS</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border border-primary/25 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
