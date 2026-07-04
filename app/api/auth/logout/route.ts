import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  await clearSessionCookie(response);
  return response;
}
