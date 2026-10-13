import { NextResponse } from "next/server";

import { registerUser } from "@/lib/actions";

export async function POST(request: Request) {
  const payload = await request.json();
  const result = await registerUser(payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, requiresApproval: result.requiresApproval }, { status: 201 });
}
