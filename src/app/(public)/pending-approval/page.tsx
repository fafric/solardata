import Link from "next/link";

export default function PendingApprovalPage() {
  const adminEmail = process.env.SUPER_ADMIN?.trim();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase text-sky-800">Access request</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Your account is awaiting approval</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Contact the administrator to request access. You can sign in after your account has been approved.
        </p>
        {adminEmail ? (
          <a href={`mailto:${adminEmail}`} className="mt-4 inline-block font-medium text-sky-800 underline underline-offset-2">
            Email {adminEmail}
          </a>
        ) : (
          <p className="mt-4 text-sm text-amber-800">Administrator contact is not configured. Please contact your system administrator.</p>
        )}
        <p className="mt-6 text-sm text-slate-600">
          <Link href="/login" className="font-medium text-sky-800 hover:underline">Return to sign in</Link>
        </p>
      </section>
    </main>
  );
}