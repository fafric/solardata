import { redirect } from "next/navigation";

import { AdminUserManagement } from "@/components/admin-user-management";
import { getUserAccess } from "@/lib/access";

export default async function AdminPage() {
  const access = await getUserAccess();
  if (access.state === "unauthenticated") redirect("/login");
  if (access.state === "pending") redirect("/pending-approval");
  if (!access.isAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase text-sky-800">Administration</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Manage access</h1>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <AdminUserManagement />
      </section>
    </div>
  );
}