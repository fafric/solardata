import mongoose from "mongoose";

export interface IImportSession {
  owner: string;
  batchId: string;
  layoutId?: string;
  stage: "upload" | "mapping" | "review" | "imported";
  mappings: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportSessionSchema = new mongoose.Schema<IImportSession>(
  {
    owner: { type: String, required: true, index: true },
    batchId: { type: String, required: true },
    layoutId: { type: String },
    stage: {
      type: String,
      enum: ["upload", "mapping", "review", "imported"],
      default: "upload",
    },
    mappings: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

const ImportSession =
  mongoose.models.ImportSession || mongoose.model<IImportSession>("ImportSession", ImportSessionSchema);

export default ImportSession;
