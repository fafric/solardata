"use client";

import { useEffect, useState } from "react";

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  approvedAt?: string;
};

export function AdminUserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/users", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load users.");
        setUsers(payload.users as ManagedUser[]);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setMessage(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function updateAccess(user: ManagedUser) {
    setBusyUserId(user._id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, isApproved: !user.isApproved }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update user access.");
      setUsers((current) => current.map((item) => item._id === user._id ? payload.user as ManagedUser : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update user access.");
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">User access</h2>
          <p className="mt-1 text-sm text-slate-600">Approve accounts before they can access protected tools.</p>
        </div>
        <span className="text-sm text-slate-500">{users.filter((user) => !user.isApproved).length} awaiting approval</span>
      </div>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2.5 font-medium">Name</th><th className="px-3 py-2.5 font-medium">Email</th><th className="px-3 py-2.5 font-medium">Registered</th><th className="px-3 py-2.5 font-medium">Access</th><th className="px-3 py-2.5 text-right font-medium">Action</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Loading users...</td></tr>
              : users.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No registered users to manage.</td></tr>
                : users.map((user) => <tr key={user._id} className="border-t border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-3 py-3 text-slate-600">{user.email}</td>
                  <td className="px-3 py-3 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3"><span className={user.isApproved ? "rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800" : "rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"}>{user.isApproved ? "Approved" : "Pending"}</span></td>
                  <td className="px-3 py-3 text-right"><button type="button" disabled={busyUserId === user._id} onClick={() => void updateAccess(user)} className={user.isApproved ? "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" : "rounded-md bg-sky-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-900 disabled:opacity-50"}>{busyUserId === user._id ? "Saving..." : user.isApproved ? "Revoke access" : "Approve"}</button></td>
                </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}