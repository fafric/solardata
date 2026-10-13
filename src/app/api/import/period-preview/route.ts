import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { makePeriodValues, parseDate, selectDateValue } from "@/lib/date-period";
import ImportBatch from "@/models/ImportBatch";

export async function POST(request: Request) {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  const payload = await request.json() as {
    batchId?: string;
    headerKey?: string;
    fallbackHeaderKey?: string;
    dayFirst?: boolean;
    mappings?: Record<string, string>;
    monthHeaderKey?: string;
    yearHeaderKey?: string;
  };
  if (!payload.batchId || typeof payload.headerKey !== "string" || typeof payload.dayFirst !== "boolean") {
    return NextResponse.json({ error: "batchId, headerKey, and dayFirst are required." }, { status: 400 });
  }

  await connectDB();
  const batch = await ImportBatch.findOne({ _id: payload.batchId, owner: access.userId }).lean<{
    sourceHeaders: string[];
    sourceRows: Record<string, string>[];
  } | null>();
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  if (payload.headerKey !== "none" && !batch.sourceHeaders.includes(payload.headerKey)) {
    return NextResponse.json({ error: "The selected date column does not exist in this batch." }, { status: 400 });
  }

  const headerKey = payload.headerKey;
  const source = { headerKey, fallbackHeaderKey: payload.fallbackHeaderKey, dayFirst: payload.dayFirst };
  const values = batch.sourceRows as Record<string, string>[];
  const preview = values.slice(0, 10).map((row) => {
    const date = headerKey === "none" ? null : selectDateValue(row, source);
    const period = makePeriodValues(date);
    return {
      sourceValue: headerKey === "none" ? "" : String(row[headerKey] ?? ""),
      fallbackValue: payload.fallbackHeaderKey ? String(row[payload.fallbackHeaderKey] ?? "") : "",
      month: period.month ?? "",
      year: period.year ?? "",
      periodKey: period.periodKey ?? "",
      periodLabel: period.periodLabel ?? "",
    };
  });
  const totalRows = values.length;
  const allValidRows = headerKey === "none" ? 0 : values.filter((row) => selectDateValue(row, source)).length;
  const monthSource = payload.monthHeaderKey;
  const yearSource = payload.yearHeaderKey;
  const mismatchCount = headerKey === "none" || (!monthSource && !yearSource) ? 0 : values.filter((row) => {
    const date = selectDateValue(row, source);
    if (!date) return false;
    const monthValue = monthSource ? String(row[monthSource] ?? "").trim().toLowerCase() : "";
    const yearValue = yearSource ? String(row[yearSource] ?? "").trim() : "";
    const expectedMonth = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date).toLowerCase();
    const expectedYear = String(date.getUTCFullYear());
    const monthMismatch = Boolean(monthValue && monthValue !== expectedMonth && monthValue !== expectedMonth.slice(0, 3) && monthValue !== String(date.getUTCMonth() + 1));
    const yearMismatch = Boolean(yearValue && yearValue !== expectedYear);
    return monthMismatch || yearMismatch;
  }).length;
  return NextResponse.json({
    preview,
    validRows: allValidRows,
    totalRows,
    rowsWithoutPeriod: totalRows - allValidRows,
    mismatchCount,
    parseRate: totalRows ? allValidRows / totalRows : 0,
    directParseRate: headerKey === "none" ? 0 : values.length
      ? values.filter((row) => parseDate(row[headerKey], { dayFirst: payload.dayFirst }) !== null).length / values.length
      : 0,
  });
}