import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import HeaderLayout from "@/models/HeaderLayout";

export default async function LayoutsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDB();
  const layouts = await HeaderLayout.find({ owner: userId }).sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-700">Layout registry</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Header layout definitions</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          {layouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-3">
              No layouts have been created yet. Upload a CSV to generate the first matching layout.
            </div>
          ) : (
            layouts.map((layout) => (
              <div key={String(layout._id)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-900">{layout.name}</p>
                <p className="mt-2 text-sm text-slate-600">{layout.description || "Operational import mapping"}</p>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                  {(layout.fields?.length ?? 0).toString()} mapped fields
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
