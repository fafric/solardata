import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPeriodFields,
  choosePeriodSource,
  detectDateCandidates,
  isValidPeriodSource,
  makePeriodValues,
  parseDate,
  selectDateValue,
} from "@/lib/date-period";
import { toImportPeriodDocuments } from "@/lib/period-aggregation";

test("date candidates use mapped date metadata or a 60 percent parse rate", () => {
  const rows = [
    { "Custom date": "not a date", "Mostly date": "2026-01-09", "Role date": "bad" },
    { "Custom date": "also bad", "Mostly date": "2026-01-10", "Role date": "bad" },
    { "Custom date": "bad", "Mostly date": "bad", "Role date": "bad" },
  ];
  const candidates = detectDateCandidates(
    ["Custom date", "Mostly date", "Role date"],
    rows,
    { "Custom date": "text", "Mostly date": "text", "Role date": "customDate" },
    [
      { key: "text", label: "Text" },
      { key: "customDate", label: "Declared on", type: "string", role: "date" },
    ],
  );
  assert.deepEqual(candidates.map((candidate) => candidate.headerKey), ["Mostly date", "Role date"]);
  assert.equal(candidates[0].parseRate, 2 / 3);
  assert.equal(candidates[1].parseRate, 0);
});

test("period source priority is saved choice, then date role, then parse rate", () => {
  const candidates = [
    { headerKey: "most-parsable", sourceHeader: "most-parsable", mappedHeaderLabel: "", parseRate: 1, samples: [], roleDate: false },
    { headerKey: "date-role", sourceHeader: "date-role", mappedHeaderLabel: "", parseRate: 0.1, samples: [], roleDate: true },
  ];
  assert.equal(choosePeriodSource(candidates, "most-parsable"), "most-parsable");
  assert.equal(choosePeriodSource(candidates, "none"), "none");
  assert.equal(choosePeriodSource(candidates), "date-role");
  assert.equal(choosePeriodSource([{ ...candidates[0], roleDate: false }]), "most-parsable");
});

test("day-first and month-first disambiguate numeric dates", () => {
  assert.equal(parseDate("01/02/2026", { dayFirst: true })?.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(parseDate("01/02/2026", { dayFirst: false })?.toISOString(), "2026-01-02T00:00:00.000Z");
});

test("fallback dates are used after the selected source fails", () => {
  const date = selectDateValue(
    { "Cash Date": "45:55.6", "IGM Date": "9-Jan-26" },
    { headerKey: "Cash Date", fallbackHeaderKey: "IGM Date", dayFirst: true },
  );
  assert.equal(date?.toISOString(), "2026-01-09T00:00:00.000Z");
  assert.equal(parseDate("45:55.6"), null);
});

test("generated period data keeps source text and sorts chronologically", () => {
  const december = applyPeriodFields(
    { "BL Date": "31-Dec-25" },
    { "BL Date": "billDate" },
    { headerKey: "BL Date", dayFirst: true, mode: "generated" },
  );
  const january = applyPeriodFields(
    { "BL Date": "9-Jan-26" },
    { "BL Date": "billDate" },
    { headerKey: "BL Date", dayFirst: true, mode: "generated" },
  );
  assert.equal(december.data["BL Date"], "31-Dec-25");
  assert.equal(january.data.month, "January");
  assert.equal(january.data.year, "2026");
  assert.equal(january.data.period, "January, 2026");
  assert.equal(january.derived.periodKey, "2026-01");
  assert.ok(december.derived.periodKey! < january.derived.periodKey!);
});

test("file Month and Year remain source values while none removes prior generated fields", () => {
  const row = { Date: "2026-01-09", Month: "Jan custom", Year: "FY26" };
  const fileColumns = applyPeriodFields(row, { Date: "date", Month: "month", Year: "year" }, {
    headerKey: "Date", dayFirst: true, mode: "file-columns",
  });
  assert.equal(fileColumns.data.month, "Jan custom");
  assert.equal(fileColumns.data.year, "FY26");
  assert.equal(fileColumns.data.period, "January, 2026");
  const noPeriod = applyPeriodFields(row, { Date: "date" }, {
    headerKey: "none", dayFirst: true, mode: "none",
  }, { ...fileColumns.data }, fileColumns.generatedKeys);
  assert.equal(noPeriod.data.period, undefined);
  assert.equal(noPeriod.derived.periodKey, null);
});

test("generated mode preserves a file's own Month and Year under separate keys", () => {
  const generated = applyPeriodFields(
    { Date: "2026-01-09", Month: "Jan reported", Year: "Fiscal 26" },
    { Date: "date", Month: "fileMonth", Year: "fileYear" },
    { headerKey: "Date", dayFirst: true, mode: "generated" },
  );
  assert.equal(generated.data.Month, "Jan reported");
  assert.equal(generated.data.fileMonth, "Jan reported");
  assert.equal(generated.data.Year, "Fiscal 26");
  assert.equal(generated.data.fileYear, "Fiscal 26");
  assert.equal(generated.data.month, "January");
  assert.equal(generated.data.year, "2026");
  const fileValues = applyPeriodFields(
    { Date: "2026-01-09", Month: "Jan reported", Year: "Fiscal 26" },
    { Date: "date", Month: "customMonth", Year: "customYear" },
    { headerKey: "Date", dayFirst: true, mode: "file-columns" },
    {},
    [],
    { month: "customMonth", year: "customYear" },
  );
  assert.equal(fileValues.data.month, "Jan reported");
  assert.equal(fileValues.data.year, "Fiscal 26");
});

test("missing periodSource is rejected by shared validation", () => {
  assert.equal(isValidPeriodSource(undefined), false);
  assert.equal(isValidPeriodSource({ headerKey: "Date", dayFirst: true, mode: "generated" }), true);
});

test("period labels retain chronological keys across year boundaries", () => {
  const december = makePeriodValues(parseDate("2025-12-01"));
  const january = makePeriodValues(parseDate("2026-01-01"));
  assert.equal(december.periodLabel, "December, 2025");
  assert.ok(december.periodKey! < january.periodKey!);
});

test("period aggregation replaces counts after re-deriving row periods", () => {
  const dec2025 = makePeriodValues(parseDate("2025-12-31"));
  const jan2026 = makePeriodValues(parseDate("2026-01-09"));
  const regeneratedRows = [dec2025, jan2026, jan2026];
  const counts = new Map<string, number>();
  for (const row of regeneratedRows) {
    if (row.periodKey) counts.set(row.periodKey, (counts.get(row.periodKey) ?? 0) + 1);
  }
  const documents = toImportPeriodDocuments("owner-1", [...counts].map(([periodKey, count]) => {
    const period = regeneratedRows.find((row) => row.periodKey === periodKey)!;
    return { _id: periodKey, year: period.periodYear!, month: period.periodMonth!, label: period.periodLabel!, count };
  }));
  assert.deepEqual(documents.map((item) => [item.periodKey, item.count]), [["2025-12", 1], ["2026-01", 2]]);
});