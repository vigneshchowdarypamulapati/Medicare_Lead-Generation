import { NextResponse } from "next/server";
import { $Enums, type PaymentType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { readJsonObject } from "@/lib/http";

const PAYMENT_TYPES = Object.values($Enums.PaymentType);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const payments = await db.payment.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ payments }, { status: 200 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { amount, type } = body;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    typeof type !== "string" ||
    !(PAYMENT_TYPES as string[]).includes(type)
  ) {
    return NextResponse.json(
      { error: "amount (a finite number >= 0) and a valid type are required" },
      { status: 400 }
    );
  }

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const roundedAmount = Math.round(amount * 100) / 100;

  const payment = await db.payment.create({
    data: { leadId, amount: roundedAmount, type: type as PaymentType, status: "UNPAID", createdById: admin.id },
  });

  return NextResponse.json({ id: payment.id }, { status: 201 });
}
