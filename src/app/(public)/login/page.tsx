import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">GovData</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Access import operations and data review workflows.</p>
        </div>

        <AuthForm mode="login" />

        <p className="text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-sky-700 hover:text-sky-800">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
