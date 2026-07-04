import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { readJsonObject } from "@/lib/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId, paymentId } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { status } = body;
  if (status !== "PAID" && status !== "UNPAID") {
    return NextResponse.json({ error: "status must be PAID or UNPAID" }, { status: 400 });
  }

  // Scoped to the lead from the path so a payment id can't be toggled through another
  // lead's URL, and so an unknown payment yields a 404 rather than a Prisma P2025 crash.
  const result = await db.payment.updateMany({
    where: { id: paymentId, leadId },
    data: { status },
  });
  if (result.count === 0) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  return NextResponse.json({ id: paymentId, status }, { status: 200 });
}
