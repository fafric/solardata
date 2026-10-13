import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { applyPeriodFields, isValidPeriodSource } from "@/lib/date-period";
import { refreshImportPeriods } from "@/lib/period-aggregation";
import CustomData from "@/models/CustomData";
import Header, { ensureSystemHeaders } from "@/models/Header";
import HeaderLayout from "@/models/HeaderLayout";
import ImportBatch from "@/models/ImportBatch";
import ImportRecord from "@/models/ImportRecord";
import ImportProfile from "@/models/ImportProfile";

export async function POST(request: Request) {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  const payload = await request.json() as {
    batchId?: string;
    mappings?: Record<string, string>;
    fileMonthHeaderKey?: string;
    fileYearHeaderKey?: string;
    periodSource?: unknown;
    remember?: boolean;
  };
  if (!payload.batchId || !isValidPeriodSource(payload.periodSource)) {
    return NextResponse.json({ error: "A valid periodSource is required." }, { status: 400 });
  }
  const periodSource = payload.periodSource;
  if (!payload.mappings || typeof payload.mappings !== "object") {
    return NextResponse.json({ error: "Field mappings are required." }, { status: 400 });
  }

  await connectDB();
  const batch = await ImportBatch.findOne({ _id: payload.batchId, owner: access.userId });
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  if (batch.status === "completed") return NextResponse.json({ error: "This batch has already been committed." }, { status: 409 });
  if (periodSource.mode === "none" ? periodSource.headerKey !== "none" : !batch.sourceHeaders.includes(periodSource.headerKey)) {
    return NextResponse.json({ error: "The selected period date is not a source column." }, { status: 400 });
  }
  if (periodSource.fallbackHeaderKey && !batch.sourceHeaders.includes(periodSource.fallbackHeaderKey)) {
    return NextResponse.json({ error: "The fallback date is not a source column." }, { status: 400 });
  }
  if ((payload.fileMonthHeaderKey && !batch.sourceHeaders.includes(payload.fileMonthHeaderKey))
    || (payload.fileYearHeaderKey && !batch.sourceHeaders.includes(payload.fileYearHeaderKey))) {
    return NextResponse.json({ error: "The file Month/Year mapping is not a source column." }, { status: 400 });
  }

  const owner = access.userId;
  const rows = batch.sourceRows as Record<string, string>[];
  const headers = batch.sourceHeaders as string[];
  const mappings = payload.mappings;
  const systemHeaders = await ensureSystemHeaders(owner);
  await ImportRecord.deleteMany({ batchId: String(batch._id), owner });
  await CustomData.deleteMany({ batchId: String(batch._id), owner });

  const records: Record<string, unknown>[] = [];
  const customRows: Record<string, unknown>[] = [];
  let rowsWithoutPeriod = 0;
  for (const sourceRow of rows) {
    const recordRow: Record<string, string | null> = {};
    for (const sourceHeader of headers) {
      const key = mappings[sourceHeader];
      const value = sourceRow[sourceHeader] ?? "";
      if (key) recordRow[key] = value;
    }
    const transformed = applyPeriodFields(sourceRow, mappings, periodSource, {}, [], {
      month: payload.fileMonthHeaderKey ? mappings[payload.fileMonthHeaderKey] : undefined,
      year: payload.fileYearHeaderKey ? mappings[payload.fileYearHeaderKey] : undefined,
    });
    if (!transformed.date) rowsWithoutPeriod += 1;
    records.push({ owner, batchId: String(batch._id), layoutId: batch.layoutId, row: recordRow });
    customRows.push({
      owner,
      batchId: String(batch._id),
      headers: transformed.headers,
      data: transformed.data,
      generatedKeys: transformed.generatedKeys,
      derived: transformed.derived,
    });
  }

  if (records.length) await ImportRecord.insertMany(records, { ordered: true });
  if (customRows.length) await CustomData.insertMany(customRows, { ordered: true });

  if (payload.remember) {
    if (batch.layoutId) {
      const layout = await HeaderLayout.findById(batch.layoutId);
      if (layout) {
        for (const [sourceHeader, key] of Object.entries(mappings)) {
          const field = layout.fields.find((candidate: { key: string; aliases: string[] }) => candidate.key === key);
          if (field && !field.aliases.some((alias: string) => alias.toLowerCase() === sourceHeader.toLowerCase())) {
            field.aliases.push(sourceHeader);
          }
        }
        await layout.save();
      }
    }
    if (periodSource.mode !== "none") {
      const headerKey = mappings[periodSource.headerKey] || periodSource.headerKey;
      await Header.findOneAndUpdate(
        { owner, key: headerKey },
        {
          $setOnInsert: { label: headerKey, type: "date", role: "date", system: false },
          $addToSet: { aliases: periodSource.headerKey },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  batch.mappings = mappings;
  batch.fileMonthHeaderKey = payload.fileMonthHeaderKey;
  batch.fileYearHeaderKey = payload.fileYearHeaderKey;
  batch.periodSource = periodSource;
  batch.remember = Boolean(payload.remember);
  batch.status = "completed";
  batch.importedRows = records.length;
  batch.rowsWithoutPeriod = rowsWithoutPeriod;
  batch.summary = `Imported ${records.length} rows; ${rowsWithoutPeriod} rows have no period.`;
  await batch.save();
  if (payload.remember) {
    await ImportProfile.findOneAndUpdate(
      { owner, layoutSignature: batch.layoutSignature },
      {
        $set: {
          periodSourceHeaderKey: periodSource.headerKey,
          fallbackHeaderKey: periodSource.fallbackHeaderKey,
          dayFirst: periodSource.dayFirst,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  await refreshImportPeriods(owner);

  return NextResponse.json({ importedRows: records.length, rowsWithoutPeriod, headers: systemHeaders }, { status: 200 });
}