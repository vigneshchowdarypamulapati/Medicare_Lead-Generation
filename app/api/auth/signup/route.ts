import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { validateSignupInput, type SignupInput } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const input: SignupInput = {
    role: typeof body.role === "string" ? body.role : "",
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    password: typeof body.password === "string" ? body.password : "",
    honeypot: typeof body.honeypot === "string" ? body.honeypot : "",
  };

  const result = validateSignupInput(input);
  if (!result.valid) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  // validateSignupInput guarantees role is AGENT or LEAD, never ADMIN.
  const role = input.role as "AGENT" | "LEAD";
  // Agents must be approved by an admin before they can log in or receive leads.
  // Leads (customers seeking assistance) are active immediately.
  const approved = role === "LEAD";

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await db.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim() || undefined,
        passwordHash,
        role,
        approved,
        active: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }

  // Agents can't log in until approved, so don't start a session — tell the client
  // the account is pending review.
  if (role === "AGENT") {
    return NextResponse.json({ status: "pending_approval" }, { status: 201 });
  }

  // Leads are logged in immediately.
  const response = NextResponse.json({ role: user.role }, { status: 201 });
  await setSessionCookie({ userId: user.id, role: user.role }, response);
  return response;
}
