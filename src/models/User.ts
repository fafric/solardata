import mongoose from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "analyst" | "reviewer";
  isApproved: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "analyst", "reviewer"], default: "analyst" },
    isApproved: { type: Boolean, default: false, index: true },
    approvedAt: { type: Date },
    approvedBy: { type: String },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
