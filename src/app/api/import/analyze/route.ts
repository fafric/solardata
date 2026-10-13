import { createHash } from "node:crypto";
import Papa from "papaparse";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { buildLayoutSignature, choosePeriodSource, detectDateCandidates, formatPeriodDate, parseDate } from "@/lib/date-period";
import { normalizeHeader } from "@/lib/normalize";
import Header, { ensureSystemHeaders } from "@/models/Header";
import HeaderLayout from "@/models/HeaderLayout";
import ImportBatch from "@/models/ImportBatch";
import ImportProfile from "@/models/ImportProfile";
import type { IFieldDefinition } from "@/models/HeaderLayout";

const DEFAULT_FIELDS = [
  { key: "supplierName", label: "Supplier Name", semanticType: "supplier", aliases: ["supplier", "supplier name", "vendor"] },
  { key: "hsCode", label: "HS Code", semanticType: "tariff_code", aliases: ["hs code", "hscode", "tariff code"] },
  { key: "originCountry", label: "Country of Origin", semanticType: "country", aliases: ["country", "origin", "country of origin"] },
  { key: "valueUsd", label: "Value (USD)", semanticType: "currency", aliases: ["value usd", "usd value", "amount"] },
  { key: "quantity", label: "Quantity", semanticType: "quantity", aliases: ["qty", "quantity", "units"] },
  { key: "declarationDate", label: "Declaration Date", semanticType: "date", type: "date", role: "date", aliases: ["date", "declaration date", "declared on"] },
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });

  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    dynamicTyping: false,
  });
  if (parsed.errors.length && !parsed.data.length) {
    return NextResponse.json({ error: "The uploaded CSV could not be parsed." }, { status: 400 });
  }

  const headers = parsed.meta.fields ?? [];
  if (!headers.length) return NextResponse.json({ error: "The CSV has no header row." }, { status: 400 });
  await connectDB();
  const [layout, registryHeaders] = await Promise.all([
    HeaderLayout.findOne({ owner: session.user.id }).sort({ createdAt: -1 }).lean<{
      _id: unknown;
      fields: IFieldDefinition[];
    } | null>(),
    ensureSystemHeaders(session.user.id),
  ]);
  const sourceFields: IFieldDefinition[] = Array.isArray(layout?.fields) && layout.fields.length
    ? layout.fields
    : DEFAULT_FIELDS;
  const fields: IFieldDefinition[] = sourceFields.filter((field) => !field.system);
  for (const header of registryHeaders.filter((item) => !item.system)) {
    const existingField = fields.find((field) => field.key === header.key);
    if (existingField) {
      existingField.aliases = [...new Set([...existingField.aliases, ...header.aliases])];
      existingField.role ??= header.role;
      existingField.type ??= header.type;
    } else {
      fields.push({
        key: header.key,
        label: header.label,
        semanticType: header.type,
        type: header.type,
        role: header.role,
        aliases: header.aliases,
      });
    }
  }
  if (!fields.some((field: { role?: string }) => field.role === "month")) {
    fields.push({ key: "fileMonth", label: "Month (from file)", semanticType: "string", role: "month", type: "string", aliases: ["month"] });
  }
  if (!fields.some((field: { role?: string }) => field.role === "year")) {
    fields.push({ key: "fileYear", label: "Year (from file)", semanticType: "string", role: "year", type: "string", aliases: ["year"] });
  }
  const mappings = Object.fromEntries(headers.map((sourceHeader) => {
    const normalized = normalizeHeader(sourceHeader);
    const matched = fields.find((field: { key: string; label: string; aliases?: string[] }) =>
      [field.key, field.label, ...(field.aliases ?? [])].some((value) => normalizeHeader(value) === normalized));
    return [sourceHeader, matched?.key ?? ""];
  }));
  const candidates = detectDateCandidates(headers, parsed.data, mappings, fields);
  const columnStats = headers.map((sourceHeader) => {
    const values = parsed.data.slice(0, 500).map((row) => row[sourceHeader]?.trim() ?? "").filter(Boolean);
    const parsedCount = values.filter((value) => parseDate(value) !== null).length;
    return {
      headerKey: sourceHeader,
      sourceHeader,
      parseRate: values.length ? parsedCount / values.length : 0,
      samples: values.slice(0, 3).map((raw) => ({
        raw,
        parsed: (() => {
          const date = parseDate(raw);
          return date ? formatPeriodDate(date) : null;
        })(),
      })),
    };
  });
  const layoutSignature = buildLayoutSignature(headers);
  const layoutHash = createHash("sha256").update(layoutSignature).digest("hex");
  const profile = await ImportProfile.findOne({ owner: session.user.id, layoutSignature: layoutHash }).lean<{
    periodSourceHeaderKey: string;
    fallbackHeaderKey?: string;
    dayFirst: boolean;
  } | null>();
  const batch = await ImportBatch.create({
    owner: session.user.id,
    fileName: file.name,
    status: "queued",
    totalRows: parsed.data.length,
    importedRows: 0,
    preview: parsed.data.slice(0, 10),
    sourceHeaders: headers,
    sourceRows: parsed.data,
    layoutId: layout ? String(layout._id) : undefined,
    layoutSignature: layoutHash,
    summary: `Analyzed ${parsed.data.length} rows. Review field mappings and period date before committing.`,
  });

  const savedHeaders = await Header.find({ owner: session.user.id }).sort({ system: 1, label: 1 }).lean();
  return NextResponse.json({
    batchId: String(batch._id),
    fileName: file.name,
    sourceHeaders: headers,
    rows: parsed.data,
    fields,
    mappings,
    systemHeaders: savedHeaders.filter((header) => header.system),
    dateCandidates: candidates,
    columnStats,
    suggestedPeriodSource: choosePeriodSource(candidates, profile?.periodSourceHeaderKey ?? null),
    savedPeriodSource: profile ? {
      headerKey: profile.periodSourceHeaderKey,
      fallbackHeaderKey: profile.fallbackHeaderKey,
      dayFirst: profile.dayFirst,
    } : null,
    layoutHash,
  }, { status: 201 });
}