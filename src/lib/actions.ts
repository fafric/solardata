"use server";

import { hash } from "bcryptjs";

import { connectDB } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import User from "@/models/User";

export async function registerUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  await connectDB();
  const existingUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();

  if (existingUser) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    password: passwordHash,
    role: parsed.data.role,
  });

  return { success: true };
}
