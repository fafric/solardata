import mongoose from "mongoose";

export interface IImportPeriod {
  owner: string;
  periodKey: string;
  periodLabel: string;
  year: number;
  month: number;
  count: number;
}

const ImportPeriodSchema = new mongoose.Schema<IImportPeriod>(
  {
    owner: { type: String, required: true, index: true },
    periodKey: { type: String, required: true },
    periodLabel: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ImportPeriodSchema.index({ owner: 1, periodKey: 1 }, { unique: true });

const ImportPeriod =
  mongoose.models.ImportPeriod || mongoose.model<IImportPeriod>("ImportPeriod", ImportPeriodSchema);

export default ImportPeriod;