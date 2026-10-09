"use client";

import Link from "next/link";
import { BarChart3, Database, LayoutTemplate, LogOut, ShieldCheck, Upload } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/layouts", label: "Layouts", icon: LayoutTemplate },
  { href: "/records", label: "Records", icon: Database },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-72 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">GovData</p>
        <h2 className="mt-3 text-xl font-semibold">Import Ops</h2>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Secure access
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
