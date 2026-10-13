import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { RecordsTable } from "@/components/records-table";
import CustomData from "@/models/CustomData";
import ImportBatch from "@/models/ImportBatch";
import ImportPeriod from "@/models/ImportPeriod";
import ImportRecord from "@/models/ImportRecord";

type PageProps = { searchParams: Promise<{ q?: string; period?: string; month?: string; year?: string; sort?: string; page?: string }> };
type StoredCustomData = {
  _id: unknown;
  batchId: string;
  data?: Record<string, string | number | boolean | null>;
  derived?: { periodKey: string | null; periodLabel: string | null; periodYear: number | null; periodMonth: number | null };
};
type StoredImportRecord = { _id: unknown; batchId: string; row?: Record<string, string | number | boolean | null> };
type StoredBatch = {
  _id: unknown;
  fileName: string;
  sourceHeaders?: string[];
  periodSource?: { headerKey: string; fallbackHeaderKey?: string; dayFirst: boolean; mode: "generated" | "file-columns" | "none" };
};
type StoredPeriod = { periodKey: string; periodLabel: string; count: number };

export default async function RecordsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDB();
  const [records, legacyRecords, batches, periods, years, params] = await Promise.all([
    CustomData.find({ owner: userId }).sort({ _id: -1 }).limit(5000).lean<StoredCustomData[]>(),
    ImportRecord.find({ owner: userId }).sort({ _id: -1 }).limit(5000).lean<StoredImportRecord[]>(),
    ImportBatch.find({ owner: userId, status: "completed" }).sort({ createdAt: -1 }).limit(50).lean<StoredBatch[]>(),
    ImportPeriod.find({ owner: userId }).sort({ periodKey: -1 }).lean<StoredPeriod[]>(),
    CustomData.distinct("derived.periodYear", { owner: userId, "derived.periodYear": { $ne: null } }),
    searchParams,
  ]);
  const serializedBatches = batches.map((batch) => ({
    id: String(batch._id),
    fileName: batch.fileName,
    sourceHeaders: batch.sourceHeaders ?? [],
    periodSource: batch.periodSource,
  }));
  const batchById = new Map(serializedBatches.map((batch) => [batch.id, batch]));
  const representedBatchIds = new Set(records.map((record) => String(record.batchId)));
  const dataRows = [
    ...records.map((record) => ({
      id: String(record._id),
      batchId: String(record.batchId),
      data: record.data ?? {},
      derived: record.derived ?? { periodKey: null, periodLabel: null, periodYear: null, periodMonth: null },
      dateHeader: batchById.get(String(record.batchId))?.periodSource?.headerKey ?? "",
    })),
    ...legacyRecords.filter((record) => !representedBatchIds.has(String(record.batchId))).map((record) => ({
      id: String(record._id),
      batchId: String(record.batchId),
      data: record.row ?? {},
      derived: { periodKey: null, periodLabel: null, periodYear: null, periodMonth: null },
      dateHeader: batchById.get(String(record.batchId))?.periodSource?.headerKey ?? "",
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-sky-700">Imported records</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Data</h1>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <RecordsTable
          records={dataRows}
          batches={serializedBatches}
          periods={periods.map((period) => ({ periodKey: period.periodKey, periodLabel: period.periodLabel, count: period.count }))}
          years={years.filter((year: unknown): year is number => typeof year === "number").sort((a: number, b: number) => b - a)}
          initialFilters={{ q: params.q ?? "", period: params.period ?? "", month: params.month ?? "", year: params.year ?? "", sort: params.sort ?? "period-newest", page: Math.max(1, Number(params.page) || 1) }}
        />
      </div>
    </div>
  );
}
