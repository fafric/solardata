import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { layoutSchema } from "@/lib/validators";
import HeaderLayout from "@/models/HeaderLayout";

export async function GET() {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  await connectDB();
  const layouts = await HeaderLayout.find({ owner: access.userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ layouts });
}

export async function POST(request: Request) {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  const payload = await request.json();
  const parsed = layoutSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid layout." }, { status: 400 });
  }

  await connectDB();
  const layout = await HeaderLayout.create({
    name: parsed.data.name,
    description: parsed.data.description,
    owner: access.userId,
    fields: parsed.data.fields,
    signature: parsed.data.fields.map((field) => field.key),
  });

  return NextResponse.json({ layout }, { status: 201 });
}
