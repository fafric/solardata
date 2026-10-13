"use client";

import { useEffect, useMemo, useState } from "react";

import { detectAmbiguousDateSamples } from "@/lib/date-period";

type ImportField = { key: string; label: string; type?: string; role?: string; semanticType?: string };
type ColumnStat = {
  headerKey: string;
  sourceHeader: string;
  parseRate: number;
  samples: { raw: string; parsed: string | null }[];
};
type Analysis = {
  batchId: string;
  fileName: string;
  sourceHeaders: string[];
  fields: ImportField[];
  mappings: Record<string, string>;
  columnStats: ColumnStat[];
  dateCandidates: { headerKey: string }[];
  suggestedPeriodSource: string | null;
  systemHeaders: ImportField[];
  savedPeriodSource: { headerKey: string; fallbackHeaderKey?: string; dayFirst: boolean } | null;
};
type PeriodPreview = {
  preview: { sourceValue: string; month: string; year: string; periodKey: string; periodLabel: string }[];
  validRows: number;
  totalRows: number;
  rowsWithoutPeriod: number;
  parseRate: number;
  mismatchCount: number;
};

const stepLabels = ["Upload", "Mapping", "Choose Period Date", "Commit"];

export function ImportUpload() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("Choose a CSV file to begin.");
  const [busy, setBusy] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [periodHeader, setPeriodHeader] = useState("");
  const [fallbackHeader, setFallbackHeader] = useState("");
  const [dayFirst, setDayFirst] = useState(true);
  const [useFileColumns, setUseFileColumns] = useState(false);
  const [remember, setRemember] = useState(true);
  const [preview, setPreview] = useState<PeriodPreview | null>(null);

  const candidates = useMemo(() => {
    if (!analysis) return [];
    return analysis.columnStats.filter((column) => {
      const field = analysis.fields.find((item) => item.key === mappings[column.sourceHeader]);
      return field?.role === "date" || field?.type === "date" || field?.semanticType === "date" || column.parseRate >= 0.6;
    });
  }, [analysis, mappings]);
  const monthSource = Object.entries(mappings).find(([, key]) => analysis?.fields.find((field) => field.key === key)?.role === "month" || key === "month" || key === "fileMonth")?.[0] ?? "";
  const yearSource = Object.entries(mappings).find(([, key]) => analysis?.fields.find((field) => field.key === key)?.role === "year" || key === "year" || key === "fileYear")?.[0] ?? "";
  const selectedStats = analysis?.columnStats.find((column) => column.headerKey === periodHeader);
  const ambiguous = detectAmbiguousDateSamples(selectedStats?.samples.map((sample) => sample.raw) ?? []);

  useEffect(() => {
    if (!analysis || step !== 2 || periodHeader === "") return;
    const controller = new AbortController();
    fetch("/api/import/period-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        batchId: analysis.batchId,
        headerKey: periodHeader,
        fallbackHeaderKey: fallbackHeader || undefined,
        dayFirst,
        mappings,
        monthHeaderKey: monthSource || undefined,
        yearHeaderKey: yearSource || undefined,
      }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not preview periods.");
      setPreview(payload as PeriodPreview);
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name !== "AbortError") setMessage(error.message);
    });
    return () => controller.abort();
  }, [analysis, step, periodHeader, fallbackHeader, dayFirst, mappings, monthSource, yearSource]);

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("Analyzing CSV...");
    try {
      const response = await fetch("/api/import/analyze", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not analyze the CSV.");
      const result = payload as Analysis;
      setAnalysis(result);
      setMappings(result.mappings);
      setPreview(null);
      setPeriodHeader(result.suggestedPeriodSource ?? "none");
      setFallbackHeader(result.savedPeriodSource?.fallbackHeaderKey ?? "");
      setDayFirst(result.savedPeriodSource?.dayFirst ?? true);
      setStep(1);
      setMessage(`${result.fileName}: ${result.sourceHeaders.length} columns detected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!analysis || !periodHeader) return;
    setBusy(true);
    setMessage("Committing rows...");
    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: analysis.batchId,
          mappings,
          fileMonthHeaderKey: monthSource || undefined,
          fileYearHeaderKey: yearSource || undefined,
          remember,
          periodSource: {
            headerKey: periodHeader,
            fallbackHeaderKey: fallbackHeader || undefined,
            dayFirst,
            mode: periodHeader === "none" ? "none" : useFileColumns ? "file-columns" : "generated",
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not commit import.");
      setMessage(`Imported ${payload.importedRows} rows. ${payload.rowsWithoutPeriod} rows have no period.`);
      setAnalysis(null);
      setStep(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Commit failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div>
          <p className="text-sm font-medium text-slate-500">Import batch</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">CSV intake</h3>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-4 border-b border-slate-200 pb-4 text-xs">
        {stepLabels.map((label, index) => (
          <li key={label} className={index === step ? "font-semibold text-sky-800" : "text-slate-500"}>
            <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full border border-current">{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={handleAnalyze} className="mt-5 space-y-4">
          <input type="file" name="file" accept=".csv,.txt" required className="block w-full text-sm text-slate-600" />
          <button type="submit" disabled={busy} className="rounded-md bg-sky-800 px-4 py-2.5 font-medium text-white hover:bg-sky-900 disabled:opacity-60">
            {busy ? "Analyzing..." : "Analyze file"}
          </button>
        </form>
      )}

      {step === 1 && analysis && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-600">Map source columns to the fields used by this layout.</p>
          <div className="max-h-80 space-y-2 overflow-auto">
            {analysis.sourceHeaders.map((header) => (
              <label key={header} className="grid grid-cols-[1fr_1fr] items-center gap-3 text-sm">
                <span className="truncate font-medium text-slate-700">{header}</span>
                <select value={mappings[header] ?? ""} onChange={(event) => setMappings((current) => ({ ...current, [header]: event.target.value }))} className="rounded-md border border-slate-300 bg-white px-2 py-2">
                  <option value="">Do not map</option>
                  {analysis.fields.filter((field) => field.key !== "month" && field.key !== "year" && field.key !== "period").map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="rounded-md bg-sky-800 px-4 py-2.5 font-medium text-white hover:bg-sky-900">Continue to period date</button>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="mt-5 space-y-5">
          <section>
            <h4 className="font-semibold text-slate-900">Choose the date that defines each row&apos;s period</h4>
            {analysis.savedPeriodSource && <p className="mt-1 text-xs text-sky-800">Using your saved choice, change?</p>}
            {!analysis.savedPeriodSource && analysis.dateCandidates.some((candidate) => candidate.headerKey === periodHeader) && <p className="mt-1 text-xs text-sky-800">Suggested from date role and parse rate; confirm or change.</p>}
            <div className="mt-3 space-y-2">
              {candidates.map((candidate) => (
                <label key={candidate.headerKey} className="flex cursor-pointer gap-3 rounded-md border border-slate-200 p-3">
                  <input type="radio" name="periodDate" checked={periodHeader === candidate.headerKey} onChange={() => setPeriodHeader(candidate.headerKey)} className="mt-1 accent-sky-800" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-slate-800">{candidate.sourceHeader}<span className="text-sm font-normal text-slate-500">{analysis.fields.find((field) => field.key === mappings[candidate.sourceHeader])?.label ?? "Unmapped"}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{Math.round(candidate.parseRate * 100)}% parse</span></span>
                    <span className="mt-1 block text-xs text-slate-600">{candidate.samples.map((sample) => `${sample.raw} -> ${sample.parsed ?? "unparseable"}`).join(" · ")}</span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <input type="radio" name="periodDate" checked={periodHeader === "none"} onChange={() => { setPeriodHeader("none"); setFallbackHeader(""); }} className="accent-sky-800" />
                <span><span className="font-medium">No period for this file</span><span className="block text-slate-500">Import rows without assigning a date period.</span></span>
              </label>
            </div>
          </section>

          {periodHeader !== "none" && periodHeader && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-700">Fallback date
                  <select value={fallbackHeader} onChange={(event) => setFallbackHeader(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2">
                    <option value="">None</option>
                    {analysis.sourceHeaders.filter((header) => header !== periodHeader).map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
                {ambiguous && <fieldset className="text-sm text-slate-700"><legend>Date format</legend><div className="mt-1 flex gap-3"><label><input type="radio" checked={dayFirst} onChange={() => setDayFirst(true)} className="mr-1 accent-sky-800" />Day first (dd/MM/yyyy)</label><label><input type="radio" checked={!dayFirst} onChange={() => setDayFirst(false)} className="mr-1 accent-sky-800" />Month first (MM/dd/yyyy)</label></div></fieldset>}
              </div>
              {(monthSource || yearSource) && <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p>This file has its own Month/Year columns.</p>
                <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={useFileColumns} onChange={(event) => setUseFileColumns(event.target.checked)} className="accent-sky-800" />Use these instead of generating</label>
                {preview && <p className="mt-1 text-xs">{preview.mismatchCount} rows differ from the selected period date.</p>}
              </div>}
              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <strong>Period preview</strong>
                  {preview && <span>{preview.validRows} of {preview.totalRows} rows have a valid date; {preview.rowsWithoutPeriod} rows will have no period</span>}
                </div>
                {preview && preview.parseRate < 0.9 && <p className="mt-2 text-sm font-medium text-amber-700">Fewer than 90% of rows have a valid date.</p>}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs"><thead><tr className="text-slate-500"><th className="py-1">Date value</th><th>Month</th><th>Year</th><th>Period key</th></tr></thead><tbody>
                    {preview?.preview.map((row, index) => <tr key={`${index}-${row.sourceValue}`} className="border-t border-slate-100"><td className="py-1.5">{row.sourceValue || "-"}</td><td>{row.month || "-"}</td><td>{row.year || "-"}</td><td>{row.periodKey || "-"}</td></tr>)}
                  </tbody></table>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2"><button onClick={() => setStep(1)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm">Back</button><button disabled={!periodHeader} onClick={() => setStep(3)} className="rounded-md bg-sky-800 px-4 py-2.5 font-medium text-white disabled:opacity-50">Review commit</button></div>
        </div>
      )}

      {step === 3 && analysis && (
        <div className="mt-5 space-y-4">
          <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>File:</strong> {analysis.fileName}</p>
            <p><strong>Rows:</strong> {preview?.totalRows ?? "-"}</p>
            {periodHeader === "none" && <p><strong>Rows without period:</strong> {preview?.totalRows ?? "-"}</p>}
            <p><strong>Period source:</strong> {periodHeader === "none" ? "No period" : periodHeader}{fallbackHeader ? `; fallback ${fallbackHeader}` : ""}</p>
            <p><strong>Period mode:</strong> {periodHeader === "none" ? "none" : useFileColumns ? "file columns" : "generated"}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-sky-800" />Remember this layout and date choice</label>
          <div className="flex gap-2"><button onClick={() => setStep(2)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm">Back</button><button onClick={handleCommit} disabled={busy} className="rounded-md bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">{busy ? "Committing..." : "Commit import"}</button></div>
        </div>
      )}

      <p aria-live="polite" className="mt-4 text-sm text-slate-600">{message}</p>
    </div>
  );
}
