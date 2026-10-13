import Papa from "papaparse";
import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { normalizeHeader } from "@/lib/normalize";
import HeaderLayout from "@/models/HeaderLayout";
import ImportBatch from "@/models/ImportBatch";
import ImportRecord from "@/models/ImportRecord";

const DEFAULT_LAYOUT = [
  { key: "supplierName", label: "Supplier Name", semanticType: "supplier", aliases: ["supplier", "supplier name", "vendor"] },
  { key: "hsCode", label: "HS Code", semanticType: "tariff_code", aliases: ["hs code", "hscode", "tariff code"] },
  { key: "originCountry", label: "Country of Origin", semanticType: "country", aliases: ["country", "origin", "country of origin"] },
  { key: "valueUsd", label: "Value (USD)", semanticType: "currency", aliases: ["value usd", "usd value", "amount"] },
  { key: "quantity", label: "Quantity", semanticType: "quantity", aliases: ["qty", "quantity", "units"] },
  { key: "declarationDate", label: "Declaration Date", semanticType: "date", aliases: ["date", "declaration date", "declared on"] },
];

function toNormalizedMap(headers: string[]) {
  return headers.reduce<Record<string, string>>((accumulator, header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return accumulator;
    accumulator[normalized] = header;
    return accumulator;
  }, {});
}

function buildRecordFromRow(row: Record<string, string>, layout: { key: string; aliases: string[] }[]) {
  const matchedRow: Record<string, string | number | boolean | null> = {};

  for (const field of layout) {
    const candidate = Object.entries(row).find(([key]) => {
      const normalizedKey = normalizeHeader(key);
      if (normalizedKey === normalizeHeader(field.key)) {
        return true;
      }

      return field.aliases.some((alias) => normalizeHeader(alias) === normalizedKey);
    });

    matchedRow[field.key] = candidate ? String(candidate[1]).trim() : null;
  }

  return matchedRow;
}

export async function POST(request: Request) {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const fileText = await file.text();
  const parsed = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    dynamicTyping: false,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json({ error: "The uploaded CSV could not be parsed." }, { status: 400 });
  }

  const headers = parsed.meta.fields ?? [];
  const normalizedHeaderMap = toNormalizedMap(headers);

  await connectDB();
  const layout = await HeaderLayout.findOne({ owner: access.userId }).sort({ createdAt: -1 }).lean<{
    _id: unknown;
    fields: { key: string; aliases: string[] }[];
  } | null>();
  const activeLayout = Array.isArray(layout?.fields) && layout.fields.length ? layout.fields : DEFAULT_LAYOUT;

  const batch = await ImportBatch.create({
    owner: access.userId,
    fileName: file.name,
    status: "processing",
    totalRows: parsed.data.length,
    importedRows: 0,
    preview: parsed.data.slice(0, 5),
    summary: `Parsed ${parsed.data.length} rows using ${activeLayout.length} mapped fields.`,
  });

  const rowsToCreate = parsed.data.slice(0, 25).map((row) => {
    const mappedRow = buildRecordFromRow(row, activeLayout);
    return {
      owner: access.userId,
      batchId: String(batch._id),
      layoutId: layout ? String(layout._id) : undefined,
      row: mappedRow,
    };
  });

  if (rowsToCreate.length) {
    await ImportRecord.insertMany(rowsToCreate);
  }

  await ImportBatch.findByIdAndUpdate(batch._id, {
    status: "completed",
    importedRows: rowsToCreate.length,
    preview: parsed.data.slice(0, 5),
    summary: `Matched ${rowsToCreate.length} rows and queued the remainder for review.`,
  });

  return NextResponse.json({
    message: `${file.name} was processed successfully.`,
    batchId: String(batch._id),
    rowsImported: rowsToCreate.length,
    matchedFields: Object.keys(normalizedHeaderMap).length,
  }, { status: 201 });
}
