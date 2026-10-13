import mongoose from "mongoose";

export interface IFieldDefinition {
  key: string;
  label: string;
  semanticType: string;
  type?: string;
  role?: string;
  system?: boolean;
  aliases: string[];
}

export interface IHeaderLayout {
  name: string;
  description?: string;
  owner: string;
  fields: IFieldDefinition[];
  signature: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    semanticType: { type: String, required: true },
    type: { type: String },
    role: { type: String },
    system: { type: Boolean, default: false },
    aliases: [{ type: String }],
  },
  { _id: false },
);

const HeaderLayoutSchema = new mongoose.Schema<IHeaderLayout>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: String, required: true, index: true },
    fields: [FieldSchema],
    signature: [{ type: String }],
  },
  { timestamps: true },
);

const HeaderLayout =
  mongoose.models.HeaderLayout || mongoose.model<IHeaderLayout>("HeaderLayout", HeaderLayoutSchema);

export default HeaderLayout;
