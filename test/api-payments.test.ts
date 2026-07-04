import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { POST } from "@/app/api/admin/leads/[id]/payments/route";
import { PATCH } from "@/app/api/admin/leads/[id]/payments/[paymentId]/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAdmin() {
  return db.user.create({
    data: { name: "Admin", email: `admin-${Math.random()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
  });
}

async function makeLead() {
  return db.lead.create({ data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103" } });
}

describe("admin payments API", () => {
  it("creates a payment record for a lead, defaulting to UNPAID", async () => {
    const admin = await makeAdmin();
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ amount: 50, type: "SOLD" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(201);

    const payment = await db.payment.findFirst({ where: { leadId: lead.id } });
    expect(payment?.amount).toBe(50);
    expect(payment?.status).toBe("UNPAID");
  });

  it("rounds the amount to 2 decimal places server-side", async () => {
    const admin = await makeAdmin();
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ amount: 19.996, type: "SOLD" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(201);

    const payment = await db.payment.findFirst({ where: { leadId: lead.id } });
    expect(payment?.amount).toBe(20);
  });

  it("toggles a payment to PAID", async () => {
    const admin = await makeAdmin();
    const lead = await makeLead();
    const payment = await db.payment.create({
      data: { leadId: lead.id, amount: 50, type: "SOLD", status: "UNPAID", createdById: admin.id },
    });
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "PAID" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id, paymentId: payment.id }) });
    expect(res.status).toBe(200);

    const updated = await db.payment.findUnique({ where: { id: payment.id } });
    expect(updated?.status).toBe("PAID");
  });
});
