import { ImportUpload } from "@/components/import-upload";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import ImportBatch from "@/models/ImportBatch";

export default async function ImportsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDB();
  const batches = await ImportBatch.find({ owner: userId }).sort({ createdAt: -1 }).limit(5).lean();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-700">Import workflow</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">CSV intake and review</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <ImportUpload />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent queue</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            {batches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-3 text-slate-500">No import batches yet.</p>
            ) : (
              batches.map((batch) => (
                <div key={String(batch._id)} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                  <div>
                    <p className="font-medium text-slate-800">{batch.fileName}</p>
                    <p className="text-xs text-slate-500">{new Date(batch.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                    {batch.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
