import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { PaymentStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { paymentId } = await params;
  const { status } = (await request.json()) as { status?: PaymentStatus };
  if (status !== "PAID" && status !== "UNPAID") {
    return NextResponse.json({ error: "status must be PAID or UNPAID" }, { status: 400 });
  }

  const payment = await db.payment.update({ where: { id: paymentId }, data: { status } });
  return NextResponse.json({ id: payment.id, status: payment.status }, { status: 200 });
}
