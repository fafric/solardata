import type { ReactNode } from "react";

import { ProtectedAuthGuard } from "@/components/protected-auth-guard";
import { Sidebar } from "@/components/sidebar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedAuthGuard>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ProtectedAuthGuard>
  );
}
