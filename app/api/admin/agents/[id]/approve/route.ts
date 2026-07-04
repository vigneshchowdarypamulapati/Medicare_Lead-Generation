import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { approved } = (await request.json()) as { approved?: boolean };

  const agent = await db.user.update({
    where: { id },
    data: { approved: Boolean(approved) },
  });

  return NextResponse.json({ id: agent.id, approved: agent.approved }, { status: 200 });
}
