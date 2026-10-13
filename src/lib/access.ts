import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

type AccessUser = {
  _id: unknown;
  email: string;
  name: string;
  role: string;
  isApproved?: boolean;
};

export type ApprovedAccess = {
  state: "approved";
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export type UserAccess =
  | { state: "unauthenticated" }
  | { state: "pending"; email: string; adminEmail: string }
  | ApprovedAccess;

export async function getUserAccess(): Promise<UserAccess> {
  const session = await auth();
  if (!session?.user?.id) return { state: "unauthenticated" };

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("email name role isApproved")
    .lean<AccessUser | null>();
  if (!user) return { state: "unauthenticated" };

  const adminEmail = process.env.SUPER_ADMIN?.trim().toLowerCase() ?? "";
  const isAdmin = Boolean(adminEmail && user.email.toLowerCase() === adminEmail);
  if (!user.isApproved && !isAdmin) {
    return { state: "pending", email: user.email, adminEmail: process.env.SUPER_ADMIN?.trim() ?? "" };
  }

  return {
    state: "approved",
    userId: String(user._id),
    email: user.email,
    name: user.name,
    isAdmin,
  };
}

export async function requireApprovedAccess() {
  const access = await getUserAccess();
  if (access.state === "approved") return { access, response: null };
  if (access.state === "pending") {
    return {
      access: null,
      response: NextResponse.json({ error: "Administrator approval is required." }, { status: 403 }),
    };
  }
  return {
    access: null,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

export async function requireAdminAccess() {
  const result = await requireApprovedAccess();
  if (!result.access) return result;
  if (result.access.isAdmin) return result;
  return {
    access: null,
    response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }),
  };
}