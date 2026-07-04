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

  it("rejects a non-finite amount", async () => {
    const admin = await makeAdmin();
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    // JSON.parse("1e999") yields Infinity, which must be rejected.
    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: '{"amount":1e999,"type":"SOLD"}',
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(400);

    const payments = await db.payment.findMany({ where: { leadId: lead.id } });
    expect(payments).toHaveLength(0);
  });

  it("returns 404 when creating a payment for an unknown lead", async () => {
    const admin = await makeAdmin();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request("http://localhost/api/admin/leads/nonexistent/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ amount: 50, type: "SOLD" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when toggling an unknown payment", async () => {
    const admin = await makeAdmin();
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/payments/nonexistent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "PAID" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id, paymentId: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the payment belongs to a different lead than the path", async () => {
    const admin = await makeAdmin();
    const leadA = await makeLead();
    const leadB = await makeLead();
    const paymentForB = await db.payment.create({
      data: { leadId: leadB.id, amount: 50, type: "SOLD", status: "UNPAID", createdById: admin.id },
    });
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${leadA.id}/payments/${paymentForB.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "PAID" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: leadA.id, paymentId: paymentForB.id }) });
    expect(res.status).toBe(404);

    const unchanged = await db.payment.findUnique({ where: { id: paymentForB.id } });
    expect(unchanged?.status).toBe("UNPAID");
  });
});
