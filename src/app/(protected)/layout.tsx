import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ProtectedAuthGuard } from "@/components/protected-auth-guard";
import { Sidebar } from "@/components/sidebar";
import { getUserAccess } from "@/lib/access";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const access = await getUserAccess();
  if (access.state === "unauthenticated") redirect("/login");
  if (access.state === "pending") redirect("/pending-approval");

  return (
    <ProtectedAuthGuard>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar isAdmin={access.isAdmin} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ProtectedAuthGuard>
  );
}
