import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import ImportRecord from "@/models/ImportRecord";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const records = await ImportRecord.find({ owner: session.user.id }).sort({ createdAt: -1 }).limit(25).lean();

  return NextResponse.json({ records });
}
