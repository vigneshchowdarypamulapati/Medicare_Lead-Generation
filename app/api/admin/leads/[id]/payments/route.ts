import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { PaymentType } from "@prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(_request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const payments = await db.payment.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ payments }, { status: 200 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const { amount, type } = (await request.json()) as { amount?: number; type?: PaymentType };

  if (typeof amount !== "number" || amount < 0 || !type) {
    return NextResponse.json({ error: "amount (>= 0) and type are required" }, { status: 400 });
  }

  const roundedAmount = Math.round(amount * 100) / 100;

  const payment = await db.payment.create({
    data: { leadId, amount: roundedAmount, type, status: "UNPAID", createdById: admin.id },
  });

  return NextResponse.json({ id: payment.id }, { status: 201 });
}
