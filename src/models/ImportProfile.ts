import mongoose from "mongoose";

export interface IImportProfile {
  owner: string;
  layoutSignature: string;
  periodSourceHeaderKey: string;
  fallbackHeaderKey?: string;
  dayFirst: boolean;
}

const ImportProfileSchema = new mongoose.Schema<IImportProfile>(
  {
    owner: { type: String, required: true, index: true },
    layoutSignature: { type: String, required: true },
    periodSourceHeaderKey: { type: String, required: true },
    fallbackHeaderKey: { type: String },
    dayFirst: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ImportProfileSchema.index({ owner: 1, layoutSignature: 1 }, { unique: true });

const ImportProfile =
  mongoose.models.ImportProfile || mongoose.model<IImportProfile>("ImportProfile", ImportProfileSchema);

export default ImportProfile;