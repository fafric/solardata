import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import ImportRecord from "@/models/ImportRecord";

export default async function RecordsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDB();
  const records = await ImportRecord.find({ owner: userId }).sort({ createdAt: -1 }).limit(10).lean();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-700">Imported records</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Validated row catalog</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">HS code</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No imported records yet.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={String(record._id)} className="border-t border-slate-200">
                  <td className="px-4 py-3">{record.batchId}</td>
                  <td className="px-4 py-3">{String(record.row.supplierName ?? "-")}</td>
                  <td className="px-4 py-3">{String(record.row.hsCode ?? "-")}</td>
                  <td className="px-4 py-3">{String(record.row.originCountry ?? "-")}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Matched
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
