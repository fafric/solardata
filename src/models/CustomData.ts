import mongoose from "mongoose";

export interface ICustomData {
  owner: string;
  batchId: string;
  headers: string[];
  data: Record<string, string | number | boolean | null>;
  generatedKeys: string[];
  derived: {
    periodDate: Date | null;
    periodYear: number | null;
    periodMonth: number | null;
    periodKey: string | null;
    periodLabel: string | null;
  };
}

const CustomDataSchema = new mongoose.Schema<ICustomData>(
  {
    owner: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    headers: [{ type: String }],
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedKeys: [{ type: String }],
    derived: {
      periodDate: { type: Date, default: null },
      periodYear: { type: Number, default: null },
      periodMonth: { type: Number, default: null },
      periodKey: { type: String, default: null },
      periodLabel: { type: String, default: null },
    },
  },
  { timestamps: true },
);

CustomDataSchema.index({ owner: 1, "derived.periodKey": 1 });
CustomDataSchema.index({ owner: 1, "derived.periodMonth": 1, "derived.periodYear": 1 });

const CustomData = mongoose.models.CustomData || mongoose.model<ICustomData>("CustomData", CustomDataSchema);

export default CustomData;