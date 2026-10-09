import Link from "next/link";

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300">GovData</p>
            <p className="mt-2 text-sm text-slate-300">Government import operations platform</p>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800">
              Sign in
            </Link>
            <Link href="/register" className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-400">
              Get started
            </Link>
          </div>
        </header>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              Secure import intelligence
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Normalize, validate, and reconcile imported data at scale.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Coordinate supplier data, match CSV headers to reusable layouts, and monitor import quality across every agency workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="rounded-full bg-sky-500 px-6 py-3 font-medium text-white hover:bg-sky-400">
                Create account
              </Link>
              <Link href="/login" className="rounded-full border border-slate-700 px-6 py-3 font-medium text-slate-100 hover:bg-slate-800">
                View dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/30">
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Live intake</p>
                <p className="mt-3 text-2xl font-semibold text-white">1,248 records processed</p>
                <p className="mt-2 text-sm text-emerald-300">97.2% matched to approved layouts</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Batches</p>
                  <p className="mt-2 text-2xl font-semibold text-white">36</p>
                </div>
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-sm text-slate-400">Alerts</p>
                  <p className="mt-2 text-2xl font-semibold text-white">04</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
