"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/new", label: "New project", icon: "＋" },
  { href: "/clips", label: "My clips", icon: "✂️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/admin", label: "API keys", icon: "🔑" },
];

export function AppShell({ user, children }: { user: { name?: string | null; email?: string | null }; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  const initials = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-surface-900/90 backdrop-blur transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Link href="/dashboard"><Logo /></Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-brand-600/20 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
                <span className="text-base">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 font-bold text-white">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name || "You"}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button onClick={logout} title="Log out" className="text-slate-500 hover:text-rose-400">⏻</button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-surface-950/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard"><Logo className="!h-7 !w-7" /></Link>
        <button onClick={() => setOpen(true)} className="btn-secondary !px-3">☰</button>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="flex-1 px-4 pb-16 pt-20 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}