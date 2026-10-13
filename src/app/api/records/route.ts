import { NextResponse } from "next/server";

import { requireApprovedAccess } from "@/lib/access";
import { connectDB } from "@/lib/db";
import ImportRecord from "@/models/ImportRecord";

export async function GET() {
  const { access, response } = await requireApprovedAccess();
  if (response) return response;

  await connectDB();
  const records = await ImportRecord.find({ owner: access.userId }).sort({ createdAt: -1 }).limit(25).lean();

  return NextResponse.json({ records });
}
