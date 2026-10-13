import CustomData from "@/models/CustomData";
import ImportPeriod from "@/models/ImportPeriod";

export function toImportPeriodDocuments(
  owner: string,
  grouped: { _id: string; year: number; month: number; label: string; count: number }[],
) {
  return grouped.map((period) => ({
    owner,
    periodKey: period._id,
    periodLabel: period.label,
    year: period.year,
    month: period.month,
    count: period.count,
  }));
}

export async function refreshImportPeriods(owner: string) {
  const grouped = await CustomData.aggregate<{ _id: string; year: number; month: number; label: string; count: number }>([
    { $match: { owner, "derived.periodKey": { $ne: null } } },
    {
      $group: {
        _id: "$derived.periodKey",
        year: { $first: "$derived.periodYear" },
        month: { $first: "$derived.periodMonth" },
        label: { $first: "$derived.periodLabel" },
        count: { $sum: 1 },
      },
    },
  ]);
  await ImportPeriod.deleteMany({ owner });
  if (grouped.length) {
    await ImportPeriod.insertMany(toImportPeriodDocuments(owner, grouped));
  }
  return grouped;
}