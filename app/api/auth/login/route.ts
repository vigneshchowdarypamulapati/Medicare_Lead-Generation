import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

// A precomputed valid bcrypt hash with no corresponding real account. Used to run a
// dummy password comparison when the email lookup misses, so that "unknown email" and
// "wrong password" take a similar amount of time and don't leak which emails are registered.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("correct-horse-battery-staple-dummy");
  }
  return dummyHashPromise;
}

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    // Run a dummy compare so this branch takes about as long as a real mismatch.
    await verifyPassword(password, await getDummyHash());
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role === "AGENT" && !user.approved) {
    return NextResponse.json({ error: "This agent account is not yet approved" }, { status: 403 });
  }

  const response = NextResponse.json({ role: user.role }, { status: 200 });
  await setSessionCookie({ userId: user.id, role: user.role }, response);
  return response;
}
