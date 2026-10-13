import mongoose from "mongoose";

export interface IImportBatch {
  owner: string;
  fileName: string;
  status: "queued" | "processing" | "completed" | "failed";
  totalRows: number;
  importedRows: number;
  rowsWithoutPeriod: number;
  preview: Record<string, string>[];
  sourceHeaders: string[];
  sourceRows: Record<string, string>[];
  mappings: Record<string, string>;
  fileMonthHeaderKey?: string;
  fileYearHeaderKey?: string;
  remember: boolean;
  layoutId?: string;
  layoutSignature: string;
  periodSource?: {
    headerKey: string;
    fallbackHeaderKey?: string;
    dayFirst: boolean;
    mode: "generated" | "file-columns" | "none";
  };
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
    rowsWithoutPeriod: { type: Number, default: 0 },
    preview: [{ type: Object }],
    sourceHeaders: [{ type: String }],
    sourceRows: [{ type: mongoose.Schema.Types.Mixed }],
    mappings: { type: Map, of: String, default: {} },
    fileMonthHeaderKey: { type: String },
    fileYearHeaderKey: { type: String },
    remember: { type: Boolean, default: false },
    layoutId: { type: String },
    layoutSignature: { type: String, default: "" },
    periodSource: {
      headerKey: { type: String },
      fallbackHeaderKey: { type: String },
      dayFirst: { type: Boolean, default: true },
      mode: { type: String, enum: ["generated", "file-columns", "none"] },
    },
    summary: { type: String },
  },
  { timestamps: true },
);

const ImportBatch = mongoose.models.ImportBatch || mongoose.model<IImportBatch>("ImportBatch", ImportBatchSchema);

export default ImportBatch;
