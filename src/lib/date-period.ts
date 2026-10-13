import { normalizeHeader } from "@/lib/normalize";

export type DateParseOptions = { dayFirst?: boolean };
export type PeriodSource = {
  headerKey: string;
  fallbackHeaderKey?: string;
  dayFirst: boolean;
  mode: "generated" | "file-columns" | "none";
};

export type DateCandidate = {
  headerKey: string;
  sourceHeader: string;
  mappedHeaderLabel: string;
  parseRate: number;
  samples: { raw: string; parsed: string | null }[];
  roleDate: boolean;
};

type CandidateField = {
  key: string;
  label: string;
  role?: string;
  type?: string;
  semanticType?: string;
};

function makeUtcDate(yearValue: number, monthValue: number, dayValue: number) {
  const year = yearValue < 100 ? (yearValue >= 50 ? 1900 + yearValue : 2000 + yearValue) : yearValue;
  if (monthValue < 1 || monthValue > 12 || dayValue < 1 || dayValue > 31) return null;
  const date = new Date(Date.UTC(year, monthValue - 1, dayValue));
  return date.getUTCFullYear() === year && date.getUTCMonth() === monthValue - 1 && date.getUTCDate() === dayValue
    ? date
    : null;
}

export function parseDate(value: unknown, options: DateParseOptions = {}): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (!raw || /^\d{1,2}:\d{1,2}(?:\.\d+)?$/.test(raw)) return null;

  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  if (iso) return makeUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    const dayFirst = options.dayFirst ?? true;
    return dayFirst
      ? makeUtcDate(year, second, first)
      : makeUtcDate(year, first, second);
  }

  const named = raw.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,})[\s,/-]+(\d{2,4})$/);
  if (named) {
    const month = new Date(`${named[2]} 1, 2000`).getMonth() + 1;
    return makeUtcDate(Number(named[3]), month, Number(named[1]));
  }

  return null;
}

export function formatPeriodDate(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date);
  return `${day} ${month} ${date.getUTCFullYear()}`;
}

export function detectAmbiguousDateSamples(values: string[]) {
  return values.some((value) => {
    const match = value.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    return Boolean(match && Number(match[1]) <= 12 && Number(match[2]) <= 12);
  });
}

export function detectDateCandidates(
  headers: string[],
  rows: Record<string, string>[],
  mappings: Record<string, string>,
  fields: CandidateField[],
): DateCandidate[] {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

  return headers.flatMap((sourceHeader) => {
    const field = fieldsByKey.get(mappings[sourceHeader] ?? "");
    const roleDate = field?.role === "date";
    const typedDate = field?.type === "date" || field?.semanticType === "date";
    const nonEmpty = rows.slice(0, 500).map((row) => row[sourceHeader]?.trim() ?? "").filter(Boolean);
    const parsedCount = nonEmpty.filter((value) => parseDate(value) !== null).length;
    const parseRate = nonEmpty.length ? parsedCount / nonEmpty.length : 0;
    if (!roleDate && !typedDate && parseRate < 0.6) return [];

    return [{
      headerKey: sourceHeader,
      sourceHeader,
      mappedHeaderLabel: field?.label ?? "Unmapped",
      parseRate,
      samples: nonEmpty.slice(0, 3).map((raw) => ({
        raw,
        parsed: (() => {
          const date = parseDate(raw);
          return date ? formatPeriodDate(date) : null;
        })(),
      })),
      roleDate,
    }];
  }).sort((left, right) => right.parseRate - left.parseRate);
}

export function suggestPeriodSource(candidates: DateCandidate[]) {
  return candidates.find((candidate) => candidate.roleDate)?.headerKey ?? candidates[0]?.headerKey ?? null;
}

export function choosePeriodSource(candidates: DateCandidate[], savedHeaderKey?: string | null) {
  if (savedHeaderKey === "none") return "none";
  if (savedHeaderKey && candidates.some((candidate) => candidate.headerKey === savedHeaderKey)) return savedHeaderKey;
  return suggestPeriodSource(candidates);
}

export function buildLayoutSignature(headers: string[]) {
  return headers.map(normalizeHeader).filter(Boolean).sort().join("|");
}

export function makePeriodValues(date: Date | null) {
  if (!date) {
    return {
      periodDate: null,
      periodYear: null,
      periodMonth: null,
      periodKey: null,
      periodLabel: null,
      month: null,
      year: null,
      period: null,
    };
  }
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date);
  return {
    periodDate: date,
    periodYear: year,
    periodMonth: monthIndex + 1,
    periodKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    periodLabel: `${month}, ${year}`,
    month,
    year: String(year),
    period: `${month}, ${year}`,
  };
}

export function selectDateValue(
  row: Record<string, string>,
  source: { headerKey: string; fallbackHeaderKey?: string; dayFirst: boolean },
) {
  return parseDate(row[source.headerKey], { dayFirst: source.dayFirst })
    ?? (source.fallbackHeaderKey ? parseDate(row[source.fallbackHeaderKey], { dayFirst: source.dayFirst }) : null);
}

export function applyPeriodFields(
  row: Record<string, string>,
  mappings: Record<string, string>,
  source: PeriodSource,
  existingData: Record<string, string | number | boolean | null> = {},
  previousGeneratedKeys: string[] = [],
  fileColumnKeys: { month?: string; year?: string } = {},
) {
  const data = { ...existingData };
  for (const [sourceHeader, key] of Object.entries(mappings)) {
    const value = row[sourceHeader] ?? "";
    data[sourceHeader] = value;
    if (key) data[key] = value;
  }
  for (const header of Object.keys(row)) {
    if (!(header in mappings)) data[header] = row[header] ?? "";
  }

  const date = source.mode === "none" ? null : selectDateValue(row, source);
  const period = makePeriodValues(date);
  const generatedKeys = source.mode === "generated"
    ? ["month", "year", "period"]
    : source.mode === "file-columns" ? ["period"] : [];
  for (const key of previousGeneratedKeys) {
    if (!generatedKeys.includes(key) && !Object.values(mappings).includes(key)) delete data[key];
  }
  if (source.mode === "generated") {
    data.month = period.month;
    data.year = period.year;
  } else if (source.mode === "file-columns") {
    const monthKey = fileColumnKeys.month ?? "fileMonth";
    const yearKey = fileColumnKeys.year ?? "fileYear";
    const sourceMonth = Object.values(mappings).includes(monthKey) ? data[monthKey] : undefined;
    const sourceYear = Object.values(mappings).includes(yearKey) ? data[yearKey] : undefined;
    if (sourceMonth !== undefined) data.month = sourceMonth;
    if (sourceYear !== undefined) data.year = sourceYear;
  }
  if (source.mode !== "none") data.period = period.period;
  const headers = [...new Set([
    ...Object.keys(row),
    ...Object.values(mappings).filter(Boolean),
    ...generatedKeys,
    ...(source.mode === "file-columns" ? ["month", "year"] : []),
  ])];
  return { data, derived: period, generatedKeys, headers, date };
}

export function isValidPeriodSource(value: unknown): value is PeriodSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<PeriodSource>;
  return typeof source.headerKey === "string"
    && typeof source.dayFirst === "boolean"
    && ["generated", "file-columns", "none"].includes(source.mode ?? "");
}