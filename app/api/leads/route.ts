import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJsonObject } from "@/lib/http";
import { validateLeadInput, type LeadInput } from "@/lib/validation";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const input: LeadInput = {
    fullName: asString(body.fullName),
    phone: asString(body.phone),
    email: asString(body.email),
    zip: asString(body.zip),
    ageBracket: asString(body.ageBracket),
    currentCoverage: asString(body.currentCoverage),
    preferredContactTime: asString(body.preferredContactTime),
    notes: asString(body.notes),
    honeypot: asString(body.honeypot),
  };

  const result = validateLeadInput(input);
  if (!result.valid) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const lead = await db.lead.create({
    data: {
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim() || null,
      zip: input.zip.trim(),
      ageBracket: input.ageBracket.trim() || null,
      currentCoverage: input.currentCoverage.trim() || null,
      preferredContactTime: input.preferredContactTime.trim() || null,
      notes: input.notes.trim() || null,
    },
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
