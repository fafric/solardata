import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { requireAdminAccess } from "@/lib/access";
import User from "@/models/User";

const accessChangeSchema = z.object({
  userId: z.string().min(1),
  isApproved: z.boolean(),
});

type UserSummary = {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isApproved?: boolean;
  createdAt: Date;
  approvedAt?: Date;
};

export async function GET() {
  const { access, response } = await requireAdminAccess();
  if (response) return response;

  await connectDB();
  const users = await User.find({ email: { $ne: access.email } })
    .select("name email role isApproved createdAt approvedAt")
    .sort({ isApproved: 1, createdAt: -1 })
    .lean<UserSummary[]>();

  return NextResponse.json({ users: users.map((user) => ({ ...user, _id: String(user._id), isApproved: user.isApproved === true })) });
}

export async function PATCH(request: Request) {
  const { access, response } = await requireAdminAccess();
  if (response) return response;

  const parsed = accessChangeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid access update." }, { status: 400 });
  }

  await connectDB();
  const target = await User.findById(parsed.data.userId).select("email").lean<{ email: string } | null>();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.email.toLowerCase() === (process.env.SUPER_ADMIN?.trim().toLowerCase() ?? "")) {
    return NextResponse.json({ error: "The configured super admin account cannot be changed here." }, { status: 409 });
  }

  const user = await User.findByIdAndUpdate(
    parsed.data.userId,
    {
      $set: {
        isApproved: parsed.data.isApproved,
        approvedAt: parsed.data.isApproved ? new Date() : null,
        approvedBy: parsed.data.isApproved ? access.email : null,
      },
    },
    { new: true },
  ).select("name email role isApproved createdAt approvedAt").lean<UserSummary | null>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: { ...user, _id: String(user._id), isApproved: user.isApproved === true } });
}