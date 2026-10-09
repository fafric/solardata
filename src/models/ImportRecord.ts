import mongoose from "mongoose";

export interface IImportRecord {
  owner: string;
  batchId: string;
  layoutId?: string;
  row: Record<string, string | number | boolean | null>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportRecordSchema = new mongoose.Schema<IImportRecord>(
  {
    owner: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    layoutId: { type: String, index: true },
    row: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const ImportRecord =
  mongoose.models.ImportRecord || mongoose.model<IImportRecord>("ImportRecord", ImportRecordSchema);

export default ImportRecord;
