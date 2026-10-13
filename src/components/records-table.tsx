"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type RecordRow = {
  id: string;
  batchId: string;
  data: Record<string, string | number | boolean | null>;
  dateHeader?: string;
  derived: {
    periodKey: string | null;
    periodLabel: string | null;
    periodYear: number | null;
    periodMonth: number | null;
  };
};

type BatchOption = {
  id: string;
  fileName: string;
  sourceHeaders: string[];
  periodSource?: { headerKey: string; fallbackHeaderKey?: string; dayFirst: boolean; mode: "generated" | "file-columns" | "none" };
};

type PeriodOption = { periodKey: string; periodLabel: string; count: number };

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getSourceValue(data: Record<string, string | number | boolean | null>, header: string) {
  const key = Object.keys(data).find((candidate) => candidate.toLowerCase() === header.toLowerCase());
  const value = key ? data[key] : null;
  return value === null || value === "" ? "-" : String(value);
}

export function RecordsTable({ records, batches, periods, years, initialFilters }: {
  records: RecordRow[];
  batches: BatchOption[];
  periods: PeriodOption[];
  years: number[];
  initialFilters: { q: string; period: string; month: string; year: string; sort: string; page: number };
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [rederive, setRederive] = useState<Record<string, { headerKey: string; fallbackHeaderKey: string; dayFirst: boolean }>>({});
  const [message, setMessage] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);

  function updateFilters(next: Partial<typeof filters>, resetPage = true) {
    const updated = { ...filters, ...next, ...(resetPage ? { page: 1 } : {}) };
    setFilters(updated);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(updated)) {
      if (value && !(key === "page" && value === 1) && !(key === "sort" && value === "period-newest")) params.set(key, String(value));
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    return records.filter((record) => {
      if (query && !Object.values(record.data).some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
      if (filters.period === "none" && record.derived.periodKey) return false;
      if (filters.period && filters.period !== "none" && record.derived.periodKey !== filters.period) return false;
      if (filters.month && record.derived.periodMonth !== Number(filters.month)) return false;
      if (filters.year && record.derived.periodYear !== Number(filters.year)) return false;
      return true;
    }).sort((left, right) => {
      const leftKey = left.derived.periodKey ?? "";
      const rightKey = right.derived.periodKey ?? "";
      if (filters.sort === "period-oldest") return leftKey.localeCompare(rightKey) || left.id.localeCompare(right.id);
      if (filters.sort === "period-newest") return rightKey.localeCompare(leftKey) || right.id.localeCompare(left.id);
      if (filters.sort === "created-oldest") return left.id.localeCompare(right.id);
      return right.id.localeCompare(left.id);
    });
  }, [records, filters]);

  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(filters.page, pageCount);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function runRederive(batch: BatchOption) {
    const choice = rederive[batch.id] ?? {
      headerKey: batch.periodSource?.headerKey ?? batch.sourceHeaders[0] ?? "none",
      fallbackHeaderKey: batch.periodSource?.fallbackHeaderKey ?? "",
      dayFirst: batch.periodSource?.dayFirst ?? true,
    };
    setMessage(`Re-deriving ${batch.fileName}...`);
    const response = await fetch(`/api/import/batches/${batch.id}/rederive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodSource: {
        ...choice,
        fallbackHeaderKey: choice.fallbackHeaderKey || undefined,
        mode: choice.headerKey === "none" ? "none" : batch.periodSource?.mode === "file-columns" ? "file-columns" : "generated",
      } }),
    });
    const payload = await response.json();
    setMessage(response.ok ? `Updated ${payload.updatedRows} rows across ${payload.periodCount} periods. Reload to see changes.` : payload.error || "Re-derive failed.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 pb-4">
        <label className="min-w-48 flex-1 text-xs font-medium text-slate-600">Search
          <input value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} placeholder="Search records" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium text-slate-600">Period
          <select value={filters.period} onChange={(event) => updateFilters({ period: event.target.value })} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-2 text-sm">
            <option value="">All periods</option><option value="none">No period</option>
            {periods.map((period) => <option key={period.periodKey} value={period.periodKey}>{period.periodLabel} ({period.count})</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Month
          <select value={filters.month} onChange={(event) => updateFilters({ month: event.target.value })} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"><option value="">All months</option>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-slate-600">Year
          <select value={filters.year} onChange={(event) => updateFilters({ year: event.target.value })} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"><option value="">All years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-slate-600">Sort
          <select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"><option value="period-newest">Period (newest first)</option><option value="period-oldest">Period (oldest first)</option><option value="created-newest">Imported (newest first)</option><option value="created-oldest">Imported (oldest first)</option></select>
        </label>
      </div>

      {batches.length > 0 && <details className="border-b border-slate-200 pb-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Re-derive periods</summary>
        <div className="mt-3 space-y-3">
          {batches.map((batch) => {
            const choice = rederive[batch.id] ?? { headerKey: batch.periodSource?.headerKey ?? "none", fallbackHeaderKey: batch.periodSource?.fallbackHeaderKey ?? "", dayFirst: batch.periodSource?.dayFirst ?? true };
            return <div key={batch.id} className="flex flex-wrap items-end gap-2 text-sm">
              <span className="mr-auto font-medium text-slate-700">{batch.fileName}</span>
              <label className="text-xs text-slate-600">Period date<select value={choice.headerKey} onChange={(event) => setRederive((state) => ({ ...state, [batch.id]: { ...choice, headerKey: event.target.value } }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5"><option value="none">No period</option>{batch.sourceHeaders.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
              <label className="text-xs text-slate-600">Fallback<select value={choice.fallbackHeaderKey} onChange={(event) => setRederive((state) => ({ ...state, [batch.id]: { ...choice, fallbackHeaderKey: event.target.value } }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5"><option value="">None</option>{batch.sourceHeaders.filter((header) => header !== choice.headerKey).map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
              <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={choice.dayFirst} onChange={(event) => setRederive((state) => ({ ...state, [batch.id]: { ...choice, dayFirst: event.target.checked } }))} className="accent-sky-800" />Day first</label>
              <button onClick={() => void runRederive(batch)} className="rounded-md bg-sky-800 px-3 py-1.5 text-xs font-medium text-white">Re-derive</button>
            </div>;
          })}
          {message && <p aria-live="polite" className="text-xs text-slate-600">{message}</p>}
        </div>
      </details>}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="px-3 py-2.5 font-medium">DESCRIPTION</th>
            <th className="px-3 py-2.5 font-medium">IMPORTER</th>
            <th className="px-3 py-2.5 font-medium"><button onClick={() => updateFilters({ sort: filters.sort === "period-oldest" ? "period-newest" : "period-oldest" }, false)}>Period</button></th>
            <th className="px-3 py-2.5 font-medium">AGENT</th>
          </tr></thead>
          <tbody>
            {visible.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No rows match these filters.</td></tr> : visible.map((record) => (
              <tr
                key={record.id}
                tabIndex={0}
                aria-label={`View all data for batch ${record.batchId.slice(-8)}`}
                onClick={() => setSelectedRecord(record)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedRecord(record);
                  }
                }}
                className="cursor-pointer border-t border-slate-200 hover:bg-sky-50 focus:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-700"
              >
                <td className="max-w-xl px-3 py-2.5">{getSourceValue(record.data, "DESCRIPTION")}</td>
                <td className="px-3 py-2.5">{getSourceValue(record.data, "IMPORTER")}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{record.derived.periodLabel ?? "No period"}</td>
                <td className="px-3 py-2.5">{getSourceValue(record.data, "AGENT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600"><span>{filtered.length} rows</span><div className="flex items-center gap-3"><span>Page {page} of {pageCount}</span><button disabled={page <= 1} onClick={() => updateFilters({ page: page - 1 }, false)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Previous</button><button disabled={page >= pageCount} onClick={() => updateFilters({ page: page + 1 }, false)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">Next</button></div></div>

      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedRecord(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-details-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setSelectedRecord(null);
            }}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 id="record-details-title" className="text-lg font-semibold text-slate-900">Imported row details</h2>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {batches.find((batch) => batch.id === selectedRecord.batchId)?.fileName ?? `Batch ${selectedRecord.batchId}`}
                  <span className="mx-2">·</span>{selectedRecord.id}
                </p>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Close row details"
                title="Close"
                onClick={() => setSelectedRecord(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-4">
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {Object.entries(selectedRecord.data).map(([key, value]) => (
                  <div key={key} className="border-b border-slate-100 py-3">
                    <dt className="break-words text-xs font-semibold uppercase text-slate-500">{key}</dt>
                    <dd className="mt-1 break-words text-sm text-slate-900">{value === null || value === "" ? "-" : String(value)}</dd>
                  </div>
                ))}
                <div className="border-b border-slate-100 py-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Period date</dt>
                  <dd className="mt-1 text-sm text-slate-900">{selectedRecord.derived.periodLabel ?? "No period"}</dd>
                </div>
              </dl>
            </div>
            <footer className="flex justify-end border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-md bg-sky-800 px-4 py-2 text-sm font-medium text-white hover:bg-sky-900">Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}