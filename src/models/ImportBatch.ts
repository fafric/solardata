import mongoose from "mongoose";

export interface IImportBatch {
  owner: string;
  fileName: string;
  status: "queued" | "processing" | "completed" | "failed";
  totalRows: number;
  importedRows: number;
  preview: Record<string, string>[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImportBatchSchema = new mongoose.Schema<IImportBatch>(
  {
    owner: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    totalRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    preview: [{ type: Object }],
    summary: { type: String },
  },
  { timestamps: true },
);

const ImportBatch = mongoose.models.ImportBatch || mongoose.model<IImportBatch>("ImportBatch", ImportBatchSchema);

export default ImportBatch;
