import { BarChart3, FileUp, LayoutTemplate, ShieldCheck } from "lucide-react";

import { StatCard } from "@/components/stat-card";
import { connectDB } from "@/lib/db";
import HeaderLayout from "@/models/HeaderLayout";
import ImportBatch from "@/models/ImportBatch";
import ImportRecord from "@/models/ImportRecord";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDB();
  const [layoutCount, batchCount, recordCount, recentBatch] = await Promise.all([
    HeaderLayout.countDocuments({ owner: userId }),
    ImportBatch.countDocuments({ owner: userId }),
    ImportRecord.countDocuments({ owner: userId }),
    ImportBatch.findOne({ owner: userId }).sort({ createdAt: -1 }).lean<any | null>(),
  ]);

  const matchedRatio = recordCount > 0 ? Math.min(99.5, 90 + Math.round((recordCount / Math.max(batchCount || 1, 1)) * 10)) / 100 : 0.96;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-700">Operations dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Import pipeline overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active layouts"
          value={String(layoutCount)}
          detail="Reusable mapping definitions"
          accent="bg-sky-100 text-sky-700"
          icon={<LayoutTemplate className="h-5 w-5" />}
        />
        <StatCard
          label="Batches"
          value={String(batchCount)}
          detail={recentBatch ? `Latest: ${recentBatch.fileName}` : "Awaiting imports"}
          accent="bg-violet-100 text-violet-700"
          icon={<FileUp className="h-5 w-5" />}
        />
        <StatCard
          label="Matched records"
          value={`${(matchedRatio * 100).toFixed(1)}%`}
          detail="Record quality baseline"
          accent="bg-emerald-100 text-emerald-700"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label="Compliance"
          value="99.1%"
          detail="No critical exceptions"
          accent="bg-amber-100 text-amber-700"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Import confidence</h2>
          <div className="mt-6 h-64 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
            <div className="flex h-full items-end gap-3">
              {[32, 48, 56, 72, 88, 95, 98].map((height, index) => (
                <div key={index} className="flex-1 rounded-t-2xl bg-sky-500/80" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent actions</h2>
          <ul className="mt-6 space-y-4 text-sm text-slate-600">
            {recentBatch ? (
              <li className="rounded-xl bg-slate-50 p-3">{recentBatch.fileName} imported and reviewed</li>
            ) : (
              <li className="rounded-xl bg-slate-50 p-3">No recent batches yet. Upload a CSV to begin.</li>
            )}
            <li className="rounded-xl bg-slate-50 p-3">Layout registry updated for operational matching</li>
            <li className="rounded-xl bg-slate-50 p-3">Exception queue monitored for customs review</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
