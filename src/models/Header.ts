import mongoose from "mongoose";

export interface IHeader {
  owner: string;
  key: string;
  label: string;
  role?: string;
  type: string;
  aliases: string[];
  system: boolean;
}

const HeaderSchema = new mongoose.Schema<IHeader>(
  {
    owner: { type: String, required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    role: { type: String },
    type: { type: String, default: "string" },
    aliases: [{ type: String }],
    system: { type: Boolean, default: false },
  },
  { timestamps: true },
);

HeaderSchema.index({ owner: 1, key: 1 }, { unique: true });

const Header = mongoose.models.Header || mongoose.model<IHeader>("Header", HeaderSchema);

export async function ensureSystemHeaders(owner: string) {
  const headers = [
    { key: "month", label: "Month", role: "month", type: "string" },
    { key: "year", label: "Year", role: "year", type: "string" },
    { key: "period", label: "Period", role: "period", type: "string" },
  ];

  await Header.bulkWrite(
    headers.map((header) => ({
      updateOne: {
        filter: { owner, key: header.key },
        update: { $setOnInsert: { ...header, owner, aliases: [], system: true } },
        upsert: true,
      },
    })),
  );

  return Header.find({ owner }).sort({ system: 1, label: 1 }).lean();
}

export default Header;