import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateLeadInput, type LeadInput } from "@/lib/validation";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<LeadInput>;
  const input: LeadInput = {
    fullName: body.fullName ?? "",
    phone: body.phone ?? "",
    email: body.email ?? "",
    zip: body.zip ?? "",
    ageBracket: body.ageBracket ?? "",
    currentCoverage: body.currentCoverage ?? "",
    preferredContactTime: body.preferredContactTime ?? "",
    notes: body.notes ?? "",
    honeypot: body.honeypot ?? "",
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
