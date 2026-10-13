import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { applyPeriodFields, isValidPeriodSource } from "@/lib/date-period";
import { refreshImportPeriods } from "@/lib/period-aggregation";
import CustomData from "@/models/CustomData";
import ImportBatch from "@/models/ImportBatch";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;
  const { id } = await context.params;
  const payload = await request.json() as {
    periodSource?: {
      headerKey: string;
      fallbackHeaderKey?: string;
      dayFirst: boolean;
      mode: "generated" | "file-columns" | "none";
    };
  };
  if (!isValidPeriodSource(payload.periodSource)) {
    return NextResponse.json({ error: "A valid periodSource is required." }, { status: 400 });
  }
  const source = payload.periodSource;

  await connectDB();
  const batch = await ImportBatch.findOne({ _id: id, owner: access.userId });
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  if (source.mode === "none" ? source.headerKey !== "none" : !batch.sourceHeaders.includes(source.headerKey)) {
    return NextResponse.json({ error: "The selected period date is not a source column." }, { status: 400 });
  }
  if (source.fallbackHeaderKey && !batch.sourceHeaders.includes(source.fallbackHeaderKey)) {
    return NextResponse.json({ error: "The fallback date is not a source column." }, { status: 400 });
  }

  const rows = batch.sourceRows as Record<string, string>[];
  const mappings = batch.mappings instanceof Map ? Object.fromEntries(batch.mappings) : batch.mappings ?? {};
  const customRows = await CustomData.find({ owner: access.userId, batchId: id }).sort({ _id: 1 });
  const updates = rows.map((row, index) => {
    const customRow = customRows[index];
    if (!customRow) return null;
    const transformed = applyPeriodFields(row, mappings, source, customRow.data, customRow.generatedKeys, {
      month: batch.fileMonthHeaderKey ? mappings[batch.fileMonthHeaderKey] : undefined,
      year: batch.fileYearHeaderKey ? mappings[batch.fileYearHeaderKey] : undefined,
    });
    return {
      updateOne: {
        filter: { _id: customRow._id },
        update: { $set: { data: transformed.data, headers: transformed.headers, generatedKeys: transformed.generatedKeys, derived: transformed.derived } },
      },
    };
  }).filter((operation): operation is NonNullable<typeof operation> => operation !== null);
  if (updates.length) await CustomData.bulkWrite(updates);

  batch.periodSource = source;
  await batch.save();
  const periods = await refreshImportPeriods(access.userId);
  return NextResponse.json({ updatedRows: updates.length, periodCount: periods.length });
}