# Medicare Lead Generation Website + CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted Next.js website that captures Medicare leads through an SEO-optimized landing page, lets an admin assign leads to approved agents (notifying both the agent and the lead), lets agents work only their own leads through a status pipeline with call logging, and tracks payments — matching every functional requirement in `docs/superpowers/specs/2026-07-03-medicare-leadgen-design.md`.

**Architecture:** Single Next.js 14 (App Router) app. Public marketing/SEO pages are server-rendered. A SQLite database (via Prisma) backs a small set of API route handlers used by the public intake form, the admin dashboard (`/admin`), and the agent portal (`/agent`). Auth is email/password with bcrypt + signed HTTP-only session cookies — no third-party auth service. All authorization (agent-sees-only-their-leads) is enforced server-side in the route handlers, never only in the UI.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma + SQLite, Tailwind CSS, bcryptjs, Vitest (unit/integration tests), Playwright (final e2e verification via the webapp-testing skill).

---

## File Structure

```
prisma/
  schema.prisma            # Data model (User, Lead, StatusHistory, Assignment, Payment, CallLog, NotificationLog)
  seed.ts                  # Creates the initial admin account
lib/
  db.ts                    # Prisma client singleton
  auth.ts                  # hashPassword / verifyPassword
  session.ts               # sign/verify session cookie, getSessionUser, requireAdmin, requireAgent
  validation.ts            # validateLeadInput (server-side form validation)
  notifications.ts         # notifyAgentAssigned, notifyLeadOfAssignment, NotificationLog writer
app/
  layout.tsx                       # Root layout, global nav shell (public)
  globals.css                      # Tailwind entry
  page.tsx                         # Landing page ("/")
  sitemap.ts                       # /sitemap.xml
  robots.ts                        # /robots.txt
  faq/page.tsx                     # /faq
  medicare-advantage/page.tsx      # educational page
  medicare-supplement/page.tsx     # educational page
  enrollment-periods/page.tsx      # educational page
  login/page.tsx                   # shared admin+agent login
  admin/
    layout.tsx                     # auth guard (ADMIN only) + nav
    page.tsx                       # lead inbox
    leads/[id]/page.tsx            # lead detail: status history, assign, calls, payments, notif log
    agents/page.tsx                # agent management (create/approve)
  agent/
    layout.tsx                     # auth guard (AGENT only) + nav + notification badge
    page.tsx                       # my leads list
    leads/[id]/page.tsx            # lead detail: status update, call log, click-to-call
  api/
    leads/route.ts                       # POST public intake form -> creates Lead
    auth/login/route.ts                  # POST login -> sets session cookie
    auth/logout/route.ts                 # POST logout -> clears session cookie
    admin/agents/route.ts                # GET list agents, POST create agent
    admin/agents/[id]/approve/route.ts   # PATCH approve/unapprove agent
    admin/leads/route.ts                 # GET all leads (filter by status/agent)
    admin/leads/[id]/assign/route.ts     # POST assign/reassign lead -> notifications
    admin/leads/[id]/payments/route.ts   # GET list / POST create payment for a lead
    admin/leads/[id]/payments/[paymentId]/route.ts  # PATCH toggle paid/unpaid
    agent/leads/route.ts                 # GET leads assigned to current agent
    agent/leads/[id]/route.ts            # GET one lead (access-controlled)
    agent/leads/[id]/status/route.ts     # PATCH update lead status -> StatusHistory
    agent/leads/[id]/calls/route.ts      # POST log a call outcome
components/
  Header.tsx
  Footer.tsx
  ClickToCallButton.tsx
  IntakeForm.tsx
  FaqAccordion.tsx
test/
  helpers/testDb.ts        # spins up an isolated SQLite file per test run, resets between tests
  auth.test.ts
  session.test.ts
  validation.test.ts
  notifications.test.ts
  api-leads.test.ts
  api-agents.test.ts
  api-assign.test.ts
  api-agent-leads.test.ts
  api-status.test.ts
  api-calls.test.ts
  api-payments.test.ts
e2e/
  full-flow.spec.ts        # Playwright: acceptance-criteria walkthrough
```

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Create the Next.js app with TypeScript + Tailwind**

```bash
cd "d:/Lead Generation"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```

When prompted about the current directory not being empty (it has `docs/`), confirm yes to continue.

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100`
Expected: `200`. Stop the dev server afterward (`kill %1` or close the background job).

- [ ] **Step 3: Add dependencies used by later tasks**

```bash
npm install prisma @prisma/client bcryptjs
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths tsx @playwright/test
```

- [ ] **Step 4: Add npm scripts**

Edit `package.json` `"scripts"` block to add:

```json
"test": "vitest run",
"test:watch": "vitest",
"db:seed": "tsx prisma/seed.ts",
"e2e": "playwright test"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with TypeScript, Tailwind, Prisma, Vitest, Playwright

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: Prisma schema and database

**Files:**
- Create: `prisma/schema.prisma`, `.env`

- [ ] **Step 1: Write the schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  AGENT
}

enum LeadStatus {
  NEW
  CONTACTED
  APPOINTMENT_SET
  SOLD
  CLOSED
  NOT_INTERESTED
}

enum PaymentType {
  BILLED
  BOOKED
  SOLD
}

enum PaymentStatus {
  PAID
  UNPAID
}

enum CallOutcome {
  ANSWERED
  MISSED
  VOICEMAIL
}

enum RecipientType {
  AGENT
  LEAD
}

enum NotifChannel {
  IN_APP
  EMAIL
}

enum NotifStatus {
  SENT
  SKIPPED
  FAILED
}

model User {
  id             String   @id @default(cuid())
  name           String
  email          String   @unique
  passwordHash   String
  role           Role
  phone          String?
  approved       Boolean  @default(false)
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())

  assignedLeads       Lead[]         @relation("AssignedAgent")
  statusChanges       StatusHistory[] @relation("StatusChangedBy")
  assignmentsFrom     Assignment[]    @relation("AssignmentFromAgent")
  assignmentsTo       Assignment[]    @relation("AssignmentToAgent")
  assignmentsMadeBy   Assignment[]    @relation("AssignmentBy")
  paymentsCreated     Payment[]       @relation("PaymentCreatedBy")
  callLogs            CallLog[]       @relation("CallLogAgent")
}

model Lead {
  id                    String     @id @default(cuid())
  fullName              String
  phone                 String
  email                 String?
  zip                   String
  ageBracket            String?
  currentCoverage       String?
  preferredContactTime  String?
  notes                 String?
  status                LeadStatus @default(NEW)
  assignedToId          String?
  assignedTo            User?      @relation("AssignedAgent", fields: [assignedToId], references: [id])
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  statusHistory     StatusHistory[]
  assignments       Assignment[]
  payments          Payment[]
  callLogs          CallLog[]
  notificationLogs  NotificationLog[]
}

model StatusHistory {
  id            String     @id @default(cuid())
  leadId        String
  lead          Lead       @relation(fields: [leadId], references: [id])
  fromStatus    LeadStatus?
  toStatus      LeadStatus
  changedById   String
  changedBy     User       @relation("StatusChangedBy", fields: [changedById], references: [id])
  createdAt     DateTime   @default(now())
}

model Assignment {
  id            String   @id @default(cuid())
  leadId        String
  lead          Lead     @relation(fields: [leadId], references: [id])
  fromAgentId   String?
  fromAgent     User?    @relation("AssignmentFromAgent", fields: [fromAgentId], references: [id])
  toAgentId     String
  toAgent       User     @relation("AssignmentToAgent", fields: [toAgentId], references: [id])
  assignedById  String
  assignedBy    User     @relation("AssignmentBy", fields: [assignedById], references: [id])
  createdAt     DateTime @default(now())
}

model Payment {
  id            String        @id @default(cuid())
  leadId        String
  lead          Lead          @relation(fields: [leadId], references: [id])
  amount        Float
  type          PaymentType
  status        PaymentStatus @default(UNPAID)
  createdById   String
  createdBy     User          @relation("PaymentCreatedBy", fields: [createdById], references: [id])
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model CallLog {
  id         String      @id @default(cuid())
  leadId     String
  lead       Lead        @relation(fields: [leadId], references: [id])
  agentId    String
  agent      User        @relation("CallLogAgent", fields: [agentId], references: [id])
  outcome    CallOutcome
  notes      String?
  createdAt  DateTime    @default(now())
}

model NotificationLog {
  id             String         @id @default(cuid())
  leadId         String
  lead           Lead           @relation(fields: [leadId], references: [id])
  recipientType  RecipientType
  channel        NotifChannel
  status         NotifStatus
  createdAt      DateTime       @default(now())
}
```

- [ ] **Step 2: Create `.env` with the dev database URL**

Create `.env`:

```
DATABASE_URL="file:./dev.db"
```

Add `.env` to `.gitignore` if not already present (create-next-app already ignores `.env*.local`; add an explicit `.env` line too since this project commits no secrets but keeps local db path out of git):

Append to `.gitignore`:
```
.env
prisma/dev.db
prisma/test.db
```

- [ ] **Step 3: Run the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/dev.db`, `prisma/migrations/`, and generates the Prisma client with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma package.json package-lock.json .gitignore
git commit -m "Add Prisma schema and run initial migration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: Prisma client singleton

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Write the singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "Add Prisma client singleton

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 4: Test database helper

**Files:**
- Create: `test/helpers/testDb.ts`, `vitest.config.ts`

Tests run against a real SQLite file (`prisma/test.db`) so Prisma queries behave exactly as in production, reset between test files by re-running migrations against a fresh file.

- [ ] **Step 1: Write vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["test/helpers/testDb.ts"],
    fileParallelism: false,
  },
});
```

`fileParallelism: false` is required because every test file shares the same SQLite file; running files in parallel would corrupt state.

- [ ] **Step 2: Write the test DB helper**

Create `test/helpers/testDb.ts`:

```typescript
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { beforeEach } from "vitest";

const testDbPath = path.join(__dirname, "..", "..", "prisma", "test.db");
process.env.DATABASE_URL = `file:${testDbPath}`;

beforeEach(() => {
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: "pipe",
  });
});
```

- [ ] **Step 3: Verify the helper works with a smoke test**

Create `test/smoke.test.ts` temporarily:

```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("test db", () => {
  it("starts empty", async () => {
    const count = await db.user.count();
    expect(count).toBe(0);
  });
});
```

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 4: Delete the smoke test (it was only to verify the harness)**

```bash
rm test/smoke.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts test/helpers/testDb.ts
git commit -m "Add Vitest config and isolated SQLite test database helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 5: Password hashing (`lib/auth.ts`)

**Files:**
- Create: `lib/auth.ts`
- Test: `test/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("auth", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement**

Create `lib/auth.ts`:

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts test/auth.test.ts
git commit -m "Add password hashing with bcrypt

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 6: Session cookies (`lib/session.ts`)

**Files:**
- Create: `lib/session.ts`
- Test: `test/session.test.ts`

Sessions are a signed JSON payload (`{ userId, role }`) stored in an HTTP-only cookie, signed with HMAC-SHA256 using a server secret so it can't be forged or tampered with client-side.

- [ ] **Step 1: Write the failing test**

Create `test/session.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

describe("session", () => {
  it("round-trips a valid session token", () => {
    const token = signSession({ userId: "user_1", role: "ADMIN" });
    const payload = verifySession(token);
    expect(payload).toEqual({ userId: "user_1", role: "ADMIN" });
  });

  it("rejects a tampered token", () => {
    const token = signSession({ userId: "user_1", role: "ADMIN" });
    const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySession("not-a-real-token")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session.test.ts`
Expected: FAIL — `Cannot find module '@/lib/session'`

- [ ] **Step 3: Implement**

Create `lib/session.ts`:

```typescript
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type SessionPayload = { userId: string; role: "ADMIN" | "AGENT" };

const COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.active) return null;
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Add `SESSION_SECRET` to `.env`**

Append to `.env`:

```
SESSION_SECRET="dev-only-secret-change-me-1f9a7c2e4b6d8f01"
```

- [ ] **Step 6: Commit**

```bash
git add lib/session.ts test/session.test.ts
git commit -m "Add signed HTTP-only session cookies

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 7: Auth guard helpers

**Files:**
- Modify: `lib/session.ts`
- Test: `test/session.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `test/session.test.ts`:

```typescript
import { requireRole } from "@/lib/session";

describe("requireRole", () => {
  it("returns the user when role matches", () => {
    const user = { id: "u1", role: "ADMIN" as const, active: true };
    expect(requireRole(user, "ADMIN")).toBe(user);
  });

  it("returns null when role does not match", () => {
    const user = { id: "u1", role: "AGENT" as const, active: true };
    expect(requireRole(user, "ADMIN")).toBeNull();
  });

  it("returns null when user is null", () => {
    expect(requireRole(null, "ADMIN")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session.test.ts`
Expected: FAIL — `requireRole is not exported`

- [ ] **Step 3: Implement**

Append to `lib/session.ts`:

```typescript
export function requireRole<T extends { role: "ADMIN" | "AGENT" }>(
  user: T | null,
  role: "ADMIN" | "AGENT"
): T | null {
  if (!user || user.role !== role) return null;
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session.test.ts`
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/session.ts test/session.test.ts
git commit -m "Add requireRole auth guard helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 8: Lead form validation

**Files:**
- Create: `lib/validation.ts`
- Test: `test/validation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateLeadInput } from "@/lib/validation";

const validInput = {
  fullName: "Jane Doe",
  phone: "555-123-4567",
  email: "jane@example.com",
  zip: "94103",
  ageBracket: "65-70",
  currentCoverage: "None",
  preferredContactTime: "Morning",
  notes: "",
  honeypot: "",
};

describe("validateLeadInput", () => {
  it("accepts fully valid input", () => {
    const result = validateLeadInput(validInput);
    expect(result.valid).toBe(true);
  });

  it("rejects missing full name", () => {
    const result = validateLeadInput({ ...validInput, fullName: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toBeDefined();
  });

  it("rejects missing phone", () => {
    const result = validateLeadInput({ ...validInput, phone: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it("rejects malformed phone", () => {
    const result = validateLeadInput({ ...validInput, phone: "not-a-phone" });
    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it("rejects missing zip", () => {
    const result = validateLeadInput({ ...validInput, zip: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.zip).toBeDefined();
  });

  it("rejects malformed zip", () => {
    const result = validateLeadInput({ ...validInput, zip: "abcde" });
    expect(result.valid).toBe(false);
    expect(result.errors.zip).toBeDefined();
  });

  it("rejects malformed email when provided", () => {
    const result = validateLeadInput({ ...validInput, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("accepts a missing email since it is optional", () => {
    const result = validateLeadInput({ ...validInput, email: "" });
    expect(result.valid).toBe(true);
  });

  it("rejects submissions where the honeypot field is filled in", () => {
    const result = validateLeadInput({ ...validInput, honeypot: "i-am-a-bot" });
    expect(result.valid).toBe(false);
    expect(result.errors.honeypot).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- validation.test.ts`
Expected: FAIL — `Cannot find module '@/lib/validation'`

- [ ] **Step 3: Implement**

Create `lib/validation.ts`:

```typescript
export type LeadInput = {
  fullName: string;
  phone: string;
  email: string;
  zip: string;
  ageBracket: string;
  currentCoverage: string;
  preferredContactTime: string;
  notes: string;
  honeypot: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof LeadInput, string>>;
};

const PHONE_RE = /^[0-9()+\-.\s]{7,20}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadInput(input: LeadInput): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (input.honeypot && input.honeypot.trim() !== "") {
    errors.honeypot = "Spam detected";
  }
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = "Full name is required";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "A valid phone number is required";
  }
  if (!input.zip || !ZIP_RE.test(input.zip.trim())) {
    errors.zip = "A valid 5-digit ZIP code is required";
  }
  if (input.email && input.email.trim() !== "" && !EMAIL_RE.test(input.email.trim())) {
    errors.email = "Email address is not valid";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- validation.test.ts`
Expected: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts test/validation.test.ts
git commit -m "Add server-side lead intake form validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 9: Notifications on assignment

**Files:**
- Create: `lib/notifications.ts`
- Test: `test/notifications.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/notifications.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { notifyAssignment } from "@/lib/notifications";

async function makeAgent(email: string) {
  return db.user.create({
    data: { name: "Agent Smith", email, passwordHash: "x", role: "AGENT", approved: true },
  });
}

async function makeLead(overrides: Partial<{ email: string | null }> = {}) {
  return db.lead.create({
    data: {
      fullName: "Jane Doe",
      phone: "555-123-4567",
      zip: "94103",
      email: overrides.email ?? "jane@example.com",
    },
  });
}

describe("notifyAssignment", () => {
  it("logs an IN_APP SENT notification for the agent", async () => {
    const agent = await makeAgent("agent1@example.com");
    const lead = await makeLead();

    await notifyAssignment({ lead, agent });

    const agentLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "AGENT" },
    });
    expect(agentLog?.channel).toBe("IN_APP");
    expect(agentLog?.status).toBe("SENT");
  });

  it("logs an EMAIL SENT notification for the lead when the lead has an email", async () => {
    const agent = await makeAgent("agent2@example.com");
    const lead = await makeLead({ email: "jane@example.com" });

    await notifyAssignment({ lead, agent });

    const leadLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "LEAD" },
    });
    expect(leadLog?.channel).toBe("EMAIL");
    expect(leadLog?.status).toBe("SENT");
  });

  it("logs an EMAIL SKIPPED notification for the lead when the lead has no email", async () => {
    const agent = await makeAgent("agent3@example.com");
    const lead = await makeLead({ email: null });

    await notifyAssignment({ lead, agent });

    const leadLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "LEAD" },
    });
    expect(leadLog?.channel).toBe("EMAIL");
    expect(leadLog?.status).toBe("SKIPPED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- notifications.test.ts`
Expected: FAIL — `Cannot find module '@/lib/notifications'`

- [ ] **Step 3: Implement**

Create `lib/notifications.ts`:

```typescript
import { db } from "@/lib/db";
import type { Lead, User } from "@prisma/client";

function notifyAgentAssigned(agent: User, lead: Lead) {
  console.log(`[notify:agent] ${agent.email} — new lead assigned: ${lead.fullName} (${lead.phone})`);
}

function notifyLeadOfAssignment(lead: Lead, agent: User) {
  console.log(
    `[notify:lead] ${lead.email} — your Medicare advocate ${agent.name} (${agent.phone ?? "no phone on file"}) will be reaching out shortly.`
  );
}

export async function notifyAssignment({ lead, agent }: { lead: Lead; agent: User }) {
  notifyAgentAssigned(agent, lead);
  await db.notificationLog.create({
    data: { leadId: lead.id, recipientType: "AGENT", channel: "IN_APP", status: "SENT" },
  });

  if (lead.email && lead.email.trim() !== "") {
    notifyLeadOfAssignment(lead, agent);
    await db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "LEAD", channel: "EMAIL", status: "SENT" },
    });
  } else {
    await db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "LEAD", channel: "EMAIL", status: "SKIPPED" },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- notifications.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/notifications.ts test/notifications.test.ts
git commit -m "Add assignment notifications for both agent and lead

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 10: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write the seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: { name: "Admin", email, passwordHash, role: "ADMIN", approved: true, active: true },
  });

  console.log(`Created admin account: ${email} / ${password}`);
  console.log("Change this password after first login (change-password flow is a future enhancement).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

- [ ] **Step 2: Run the seed script against the dev database**

```bash
npm run db:seed
```

Expected: `Created admin account: admin@example.com / ChangeMe123!`

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "Add database seed script for initial admin account

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 11: Public intake API route

**Files:**
- Create: `app/api/leads/route.ts`
- Test: `test/api-leads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-leads.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { POST } from "@/app/api/leads/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  fullName: "Jane Doe",
  phone: "555-123-4567",
  email: "jane@example.com",
  zip: "94103",
  ageBracket: "65-70",
  currentCoverage: "None",
  preferredContactTime: "Morning",
  notes: "",
  honeypot: "",
};

describe("POST /api/leads", () => {
  it("creates a lead and returns 201 for valid input", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(1);
    expect(leads[0].fullName).toBe("Jane Doe");
    expect(leads[0].status).toBe("NEW");
  });

  it("returns 400 and creates no lead for invalid input", async () => {
    const res = await POST(makeRequest({ ...validBody, phone: "" }));
    expect(res.status).toBe(400);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(0);
  });

  it("returns 400 and creates no lead when the honeypot is filled", async () => {
    const res = await POST(makeRequest({ ...validBody, honeypot: "bot" }));
    expect(res.status).toBe(400);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-leads.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/leads/route'`

- [ ] **Step 3: Implement**

Create `app/api/leads/route.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-leads.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/leads/route.ts test/api-leads.test.ts
git commit -m "Add public lead intake API route with validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 12: Login and logout API routes

**Files:**
- Create: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
- Test: `test/api-auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  it("sets a session cookie for correct admin credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Admin", email: "admin@x.com", passwordHash, role: "ADMIN", approved: true, active: true },
    });

    const res = await login(makeRequest({ email: "admin@x.com", password: "secret123" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Admin", email: "admin2@x.com", passwordHash, role: "ADMIN", approved: true, active: true },
    });

    const res = await login(makeRequest({ email: "admin2@x.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("rejects an unapproved agent", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Agent", email: "agent@x.com", passwordHash, role: "AGENT", approved: false, active: true },
    });

    const res = await login(makeRequest({ email: "agent@x.com", password: "secret123" }));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-auth.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/auth/login/route'`

- [ ] **Step 3: Implement**

Create `app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role === "AGENT" && !user.approved) {
    return NextResponse.json({ error: "This agent account is not yet approved" }, { status: 403 });
  }

  await setSessionCookie({ userId: user.id, role: user.role });
  return NextResponse.json({ role: user.role }, { status: 200 });
}
```

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-auth.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/auth test/api-auth.test.ts
git commit -m "Add login and logout API routes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 13: Admin agent management API

**Files:**
- Create: `app/api/admin/agents/route.ts`, `app/api/admin/agents/[id]/approve/route.ts`
- Test: `test/api-agents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-agents.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET, POST } from "@/app/api/admin/agents/route";
import { PATCH } from "@/app/api/admin/agents/[id]/approve/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAdminCookie() {
  const admin = await db.user.create({
    data: { name: "Admin", email: `admin-${Date.now()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
  });
  return `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;
}

async function makeAgentCookie() {
  const agent = await db.user.create({
    data: { name: "Agent", email: `agent-${Date.now()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
  return `session=${signSession({ userId: agent.id, role: "AGENT" })}`;
}

describe("admin agents API", () => {
  it("lets an admin create a new agent", async () => {
    const cookie = await makeAdminCookie();
    const req = new Request("http://localhost/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "New Agent", email: "newagent@x.com", password: "pw123456", phone: "555-000-1111" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const agent = await db.user.findUnique({ where: { email: "newagent@x.com" } });
    expect(agent?.role).toBe("AGENT");
    expect(agent?.approved).toBe(false);
  });

  it("rejects agent creation from a non-admin", async () => {
    const cookie = await makeAgentCookie();
    const req = new Request("http://localhost/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "New Agent", email: "blocked@x.com", password: "pw123456", phone: "555" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("lists all agents for an admin", async () => {
    const cookie = await makeAdminCookie();
    await db.user.create({
      data: { name: "Agent A", email: "a@x.com", passwordHash: "x", role: "AGENT", approved: false },
    });

    const req = new Request("http://localhost/api/admin/agents", { headers: { cookie } });
    const res = await GET(req);
    const data = (await res.json()) as { agents: unknown[] };
    expect(res.status).toBe(200);
    expect(data.agents.length).toBeGreaterThanOrEqual(1);
  });

  it("lets an admin approve an agent", async () => {
    const cookie = await makeAdminCookie();
    const agent = await db.user.create({
      data: { name: "Agent B", email: "b@x.com", passwordHash: "x", role: "AGENT", approved: false },
    });

    const req = new Request(`http://localhost/api/admin/agents/${agent.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ approved: true }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);

    const updated = await db.user.findUnique({ where: { id: agent.id } });
    expect(updated?.approved).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-agents.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/admin/agents/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, phone } = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const agent = await db.user.create({
    data: { name, email, passwordHash, phone, role: "AGENT", approved: false, active: true },
  });

  return NextResponse.json({ id: agent.id }, { status: 201 });
}
```

Create `app/api/admin/agents/[id]/approve/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { approved } = (await request.json()) as { approved?: boolean };

  const agent = await db.user.update({
    where: { id },
    data: { approved: Boolean(approved) },
  });

  return NextResponse.json({ id: agent.id, approved: agent.approved }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-agents.test.ts`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/agents test/api-agents.test.ts
git commit -m "Add admin agent management API (create, list, approve)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 14: Admin lead list + assignment API

**Files:**
- Create: `app/api/admin/leads/route.ts`, `app/api/admin/leads/[id]/assign/route.ts`
- Test: `test/api-assign.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-assign.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET } from "@/app/api/admin/leads/route";
import { POST } from "@/app/api/admin/leads/[id]/assign/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAdmin() {
  return db.user.create({
    data: { name: "Admin", email: `admin-${Date.now()}-${Math.random()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
  });
}

async function makeAgent(approved = true) {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Date.now()}-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved },
  });
}

async function makeLead() {
  return db.lead.create({ data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", email: "jane@example.com" } });
}

describe("admin leads API", () => {
  it("lists all leads for an admin", async () => {
    const admin = await makeAdmin();
    await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;
    const res = await GET(new Request("http://localhost/api/admin/leads", { headers: { cookie } }));
    const data = (await res.json()) as { leads: unknown[] };
    expect(res.status).toBe(200);
    expect(data.leads.length).toBeGreaterThanOrEqual(1);
  });

  it("assigns a lead to an approved agent, records the audit trail, and notifies both parties", async () => {
    const admin = await makeAdmin();
    const agent = await makeAgent(true);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ agentId: agent.id }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(200);

    const updated = await db.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.assignedToId).toBe(agent.id);

    const assignment = await db.assignment.findFirst({ where: { leadId: lead.id } });
    expect(assignment?.toAgentId).toBe(agent.id);
    expect(assignment?.assignedById).toBe(admin.id);

    const notifLogs = await db.notificationLog.findMany({ where: { leadId: lead.id } });
    const recipientTypes = notifLogs.map((n) => n.recipientType).sort();
    expect(recipientTypes).toEqual(["AGENT", "LEAD"]);
  });

  it("rejects assignment to an unapproved agent", async () => {
    const admin = await makeAdmin();
    const agent = await makeAgent(false);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ agentId: agent.id }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(400);
  });

  it("records fromAgentId on reassignment", async () => {
    const admin = await makeAdmin();
    const agentA = await makeAgent(true);
    const agentB = await makeAgent(true);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    await POST(
      new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ agentId: agentA.id }),
      }),
      { params: Promise.resolve({ id: lead.id }) }
    );

    const res = await POST(
      new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ agentId: agentB.id }),
      }),
      { params: Promise.resolve({ id: lead.id }) }
    );
    expect(res.status).toBe(200);

    const reassignment = await db.assignment.findFirst({
      where: { leadId: lead.id, toAgentId: agentB.id },
    });
    expect(reassignment?.fromAgentId).toBe(agentA.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-assign.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/admin/leads/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { LeadStatus } from "@prisma/client";

export async function GET(request: Request) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as LeadStatus | null;
  const agentId = url.searchParams.get("agentId");

  const leads = await db.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(agentId ? { assignedToId: agentId } : {}),
    },
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads }, { status: 200 });
}
```

Create `app/api/admin/leads/[id]/assign/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { notifyAssignment } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const { agentId } = (await request.json()) as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

  const [lead, agent] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId } }),
    db.user.findUnique({ where: { id: agentId } }),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!agent || agent.role !== "AGENT" || !agent.approved || !agent.active) {
    return NextResponse.json({ error: "Agent is not an approved, active agent" }, { status: 400 });
  }

  const previousAgentId = lead.assignedToId;

  const updatedLead = await db.$transaction(async (tx) => {
    await tx.assignment.create({
      data: {
        leadId: lead.id,
        fromAgentId: previousAgentId,
        toAgentId: agent.id,
        assignedById: admin.id,
      },
    });
    return tx.lead.update({ where: { id: lead.id }, data: { assignedToId: agent.id } });
  });

  await notifyAssignment({ lead: updatedLead, agent });

  return NextResponse.json({ id: updatedLead.id, assignedToId: updatedLead.assignedToId }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-assign.test.ts`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/leads test/api-assign.test.ts
git commit -m "Add admin lead listing and assignment API with audit trail and notifications

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 15: Admin payments API

**Files:**
- Create: `app/api/admin/leads/[id]/payments/route.ts`, `app/api/admin/leads/[id]/payments/[paymentId]/route.ts`
- Test: `test/api-payments.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-payments.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-payments.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/admin/leads/[id]/payments/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { PaymentType } from "@prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const payments = await db.payment.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ payments }, { status: 200 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const { amount, type } = (await request.json()) as { amount?: number; type?: PaymentType };

  if (typeof amount !== "number" || amount < 0 || !type) {
    return NextResponse.json({ error: "amount (>= 0) and type are required" }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: { leadId, amount, type, status: "UNPAID", createdById: admin.id },
  });

  return NextResponse.json({ id: payment.id }, { status: 201 });
}
```

Create `app/api/admin/leads/[id]/payments/[paymentId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { PaymentStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const admin = requireRole(await getSessionUser(), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { paymentId } = await params;
  const { status } = (await request.json()) as { status?: PaymentStatus };
  if (status !== "PAID" && status !== "UNPAID") {
    return NextResponse.json({ error: "status must be PAID or UNPAID" }, { status: 400 });
  }

  const payment = await db.payment.update({ where: { id: paymentId }, data: { status } });
  return NextResponse.json({ id: payment.id, status: payment.status }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-payments.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/leads/[id]/payments test/api-payments.test.ts
git commit -m "Add admin payment tracking API

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 16: Agent leads API (access-controlled)

**Files:**
- Create: `app/api/agent/leads/route.ts`, `app/api/agent/leads/[id]/route.ts`
- Test: `test/api-agent-leads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-agent-leads.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET as listMine } from "@/app/api/agent/leads/route";
import { GET as getOne } from "@/app/api/agent/leads/[id]/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

async function makeLead(assignedToId?: string) {
  return db.lead.create({ data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId } });
}

describe("agent leads API", () => {
  it("returns only leads assigned to the requesting agent", async () => {
    const agentA = await makeAgent();
    const agentB = await makeAgent();
    await makeLead(agentA.id);
    await makeLead(agentB.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await listMine(new Request("http://localhost/api/agent/leads", { headers: { cookie } }));
    const data = (await res.json()) as { leads: { assignedToId: string }[] };

    expect(res.status).toBe(200);
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0].assignedToId).toBe(agentA.id);
  });

  it("returns 404 when an agent requests a lead assigned to someone else", async () => {
    const agentA = await makeAgent();
    const agentB = await makeAgent();
    const leadForB = await makeLead(agentB.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await getOne(
      new Request(`http://localhost/api/agent/leads/${leadForB.id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: leadForB.id }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns the lead when it is assigned to the requesting agent", async () => {
    const agentA = await makeAgent();
    const lead = await makeLead(agentA.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await getOne(
      new Request(`http://localhost/api/agent/leads/${lead.id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: lead.id }) }
    );

    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-agent-leads.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/agent/leads/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function GET() {
  const agent = requireRole(await getSessionUser(), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leads = await db.lead.findMany({
    where: { assignedToId: agent.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ leads }, { status: 200 });
}
```

Create `app/api/agent/leads/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, assignedToId: agent.id },
    include: { statusHistory: { orderBy: { createdAt: "desc" } }, callLogs: { orderBy: { createdAt: "desc" } } },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-agent-leads.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/agent/leads test/api-agent-leads.test.ts
git commit -m "Add agent leads API restricted to the requesting agent's own leads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 17: Agent status update API

**Files:**
- Create: `app/api/agent/leads/[id]/status/route.ts`
- Test: `test/api-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-status.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { PATCH } from "@/app/api/agent/leads/[id]/status/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

describe("PATCH /api/agent/leads/:id/status", () => {
  it("updates the lead status and records status history", async () => {
    const agent = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: agent.id },
    });
    const cookie = `session=${signSession({ userId: agent.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(200);

    const updated = await db.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.status).toBe("CONTACTED");

    const history = await db.statusHistory.findFirst({ where: { leadId: lead.id } });
    expect(history?.fromStatus).toBe("NEW");
    expect(history?.toStatus).toBe("CONTACTED");
    expect(history?.changedById).toBe(agent.id);
  });

  it("rejects updates from an agent who does not own the lead", async () => {
    const owner = await makeAgent();
    const outsider = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: owner.id },
    });
    const cookie = `session=${signSession({ userId: outsider.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-status.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/agent/leads/[id]/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { LeadStatus } from "@prisma/client";

const VALID_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "APPOINTMENT_SET",
  "SOLD",
  "CLOSED",
  "NOT_INTERESTED",
];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status } = (await request.json()) as { status?: LeadStatus };
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedToId: agent.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.$transaction(async (tx) => {
    await tx.statusHistory.create({
      data: { leadId: lead.id, fromStatus: lead.status, toStatus: status, changedById: agent.id },
    });
    return tx.lead.update({ where: { id: lead.id }, data: { status } });
  });

  return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-status.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/agent/leads/[id]/status test/api-status.test.ts
git commit -m "Add agent lead status update API with status history audit trail

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 18: Agent call logging API

**Files:**
- Create: `app/api/agent/leads/[id]/calls/route.ts`
- Test: `test/api-calls.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/api-calls.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { POST } from "@/app/api/agent/leads/[id]/calls/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

describe("POST /api/agent/leads/:id/calls", () => {
  it("logs a call outcome for a lead owned by the agent", async () => {
    const agent = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: agent.id },
    });
    const cookie = `session=${signSession({ userId: agent.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ outcome: "MISSED", notes: "No answer, left voicemail" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(201);

    const call = await db.callLog.findFirst({ where: { leadId: lead.id } });
    expect(call?.outcome).toBe("MISSED");
    expect(call?.agentId).toBe(agent.id);
  });

  it("rejects logging a call for a lead not owned by the agent", async () => {
    const owner = await makeAgent();
    const outsider = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: owner.id },
    });
    const cookie = `session=${signSession({ userId: outsider.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ outcome: "ANSWERED" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-calls.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

Create `app/api/agent/leads/[id]/calls/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { CallOutcome } from "@prisma/client";

const VALID_OUTCOMES: CallOutcome[] = ["ANSWERED", "MISSED", "VOICEMAIL"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { outcome, notes } = (await request.json()) as { outcome?: CallOutcome; notes?: string };
  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedToId: agent.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const call = await db.callLog.create({
    data: { leadId: lead.id, agentId: agent.id, outcome, notes: notes ?? null },
  });

  return NextResponse.json({ id: call.id }, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-calls.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add app/api/agent/leads/[id]/calls test/api-calls.test.ts
git commit -m "Add agent call logging API

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 19: Shared public UI components

**Files:**
- Create: `components/Header.tsx`, `components/Footer.tsx`, `components/ClickToCallButton.tsx`

- [ ] **Step 1: Add the business phone number to env**

Append to `.env`:

```
NEXT_PUBLIC_BUSINESS_PHONE="+18005551234"
NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY="(800) 555-1234"
```

- [ ] **Step 2: Create the click-to-call button**

Create `components/ClickToCallButton.tsx`:

```tsx
type Props = {
  className?: string;
  label?: string;
};

export default function ClickToCallButton({ className, label }: Props) {
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+18005551234";
  const display = process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? "(800) 555-1234";

  return (
    <a
      href={`tel:${phone}`}
      className={
        className ??
        "inline-block rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
      }
    >
      {label ?? `Call ${display}`}
    </a>
  );
}
```

- [ ] **Step 3: Create the header**

Create `components/Header.tsx`:

```tsx
import Link from "next/link";
import ClickToCallButton from "./ClickToCallButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-green-100">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-green-800">
          Medicare Coverage Guidance
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-slate-700">
          <Link href="/medicare-advantage" className="hover:text-green-800">Medicare Advantage</Link>
          <Link href="/medicare-supplement" className="hover:text-green-800">Medicare Supplement</Link>
          <Link href="/enrollment-periods" className="hover:text-green-800">Enrollment Periods</Link>
          <Link href="/faq" className="hover:text-green-800">FAQ</Link>
        </nav>
        <ClickToCallButton className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800 transition-colors" />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create the footer**

Create `components/Footer.tsx`:

```tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold text-white mb-2">Medicare Coverage Guidance</p>
          <p>Education-focused Medicare guidance to help you understand your options. Not affiliated with or endorsed by the U.S. government or the federal Medicare program.</p>
        </div>
        <div>
          <p className="font-semibold text-white mb-2">Learn</p>
          <ul className="space-y-1">
            <li><Link href="/medicare-advantage" className="hover:text-white">Medicare Advantage</Link></li>
            <li><Link href="/medicare-supplement" className="hover:text-white">Medicare Supplement</Link></li>
            <li><Link href="/enrollment-periods" className="hover:text-white">Enrollment Periods</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-2">Get Help</p>
          <p>Speak with a licensed Medicare advocate about your coverage options.</p>
          <Link href="/#intake-form" className="hover:text-white underline">Request a callback</Link>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Medicare Coverage Guidance. All rights reserved.
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/Footer.tsx components/ClickToCallButton.tsx .env
git commit -m "Add shared header, footer, and click-to-call components

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 20: Intake form component

**Files:**
- Create: `components/IntakeForm.tsx`

- [ ] **Step 1: Create the form component**

Create `components/IntakeForm.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";

type Errors = Record<string, string>;

export default function IntakeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSubmitting(false);

    if (res.status === 201) {
      setSubmitted(true);
      form.reset();
      return;
    }

    const body = (await res.json()) as { errors?: Errors };
    setErrors(body.errors ?? { form: "Something went wrong. Please try again." });
  }

  if (submitted) {
    return (
      <div id="intake-form" className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
        <h3 className="text-xl font-bold text-green-800 mb-2">Thank you!</h3>
        <p className="text-slate-700">
          A licensed Medicare advocate will reach out to you shortly. If your matter is urgent, feel free to call us directly.
        </p>
      </div>
    );
  }

  return (
    <form id="intake-form" onSubmit={handleSubmit} className="rounded-xl bg-white border border-green-200 shadow-sm p-6 md:p-8 grid gap-4">
      <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="fullName">Full name *</label>
        <input id="fullName" name="fullName" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="phone">Phone *</label>
          <input id="phone" name="phone" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="zip">ZIP code *</label>
          <input id="zip" name="zip" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          {errors.zip && <p className="text-sm text-red-600 mt-1">{errors.zip}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="ageBracket">Age range</label>
          <select id="ageBracket" name="ageBracket" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Prefer not to say</option>
            <option value="Under 65">Under 65</option>
            <option value="65-70">65-70</option>
            <option value="71-75">71-75</option>
            <option value="76+">76+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="preferredContactTime">Best time to call</label>
          <select id="preferredContactTime" name="preferredContactTime" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">No preference</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="currentCoverage">Current coverage</label>
        <input id="currentCoverage" name="currentCoverage" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="notes">Anything else we should know?</label>
        <textarea id="notes" name="notes" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>

      {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Submitting..." : "Speak with a Medicare Advocate"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/IntakeForm.tsx
git commit -m "Add lead intake form component with client-side + server-side validation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 21: Landing page and root layout

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Update the root layout with metadata and fonts**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Medicare Education & Coverage Guidance",
    template: "%s | Medicare Coverage Guidance",
  },
  description:
    "Free, education-focused Medicare guidance. Understand Medicare Advantage, Medicare Supplement, and enrollment periods, and find coverage that fits your needs.",
  openGraph: {
    title: "Medicare Education & Coverage Guidance",
    description:
      "We help you understand your Medicare options and find coverage that fits your needs. Education-focused, not sales-driven.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_SITE_URL` to `.env`**

Append to `.env`:

```
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

- [ ] **Step 3: Write the landing page**

Replace `app/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";
import IntakeForm from "@/components/IntakeForm";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Medicare Education & Coverage Guidance",
  description:
    "We help you understand your Medicare options and find coverage that fits your needs. Education-focused, not sales-driven. Speak with a licensed Medicare advocate today.",
};

const faqItems = [
  {
    question: "Is this a government website?",
    answer:
      "No. We are an independent Medicare education service and are not affiliated with or endorsed by the U.S. government or the federal Medicare program.",
  },
  {
    question: "Will I be pressured to buy a plan?",
    answer:
      "No. Our goal is to help you understand your options. Any licensed advocate you speak with can walk you through coverage choices, but the decision is always yours.",
  },
  {
    question: "Is there a cost to speak with an advocate?",
    answer: "No, guidance is provided at no cost to you.",
  },
  {
    question: "What information do I need to have ready?",
    answer:
      "It helps to have your current coverage details on hand, but it's not required. An advocate can walk you through everything.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-gradient-to-b from-green-50 to-white">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 mb-4">
              Medicare Education &amp; Coverage Guidance
            </h1>
            <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
              We help you understand your Medicare options and find coverage that fits your needs.
              Education-focused, not sales-driven.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#intake-form"
                className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
              >
                Speak with a Medicare Advocate
              </a>
              <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 grid gap-8 md:grid-cols-3">
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Understand Your Options</h2>
            <p className="text-slate-700 text-sm">
              Learn the differences between{" "}
              <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>{" "}
              and{" "}
              <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
              plans in plain language.
            </p>
          </article>
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Know Your Timing</h2>
            <p className="text-slate-700 text-sm">
              Missing an{" "}
              <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment period</Link>{" "}
              can limit your options. We help you understand key deadlines.
            </p>
          </article>
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Talk to a Real Person</h2>
            <p className="text-slate-700 text-sm">
              A licensed Medicare advocate can answer your questions directly — no pressure, no obligation.
            </p>
          </article>
        </section>

        <section className="bg-green-50 py-16">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">
              Request Your Free Coverage Guidance
            </h2>
            <IntakeForm />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-bold text-green-800 mb-6">Frequently Asked Questions</h2>
          <FaqAccordion items={faqItems} />
        </section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Verify the page renders**

Run: `npm run dev -- --port 3100 &` then `curl -s http://localhost:3100 | grep -o "Medicare Education"`
Expected: `Medicare Education` printed at least once. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx .env
git commit -m "Build the Medicare education landing page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 22: FAQ accordion + FAQ page with structured data

**Files:**
- Create: `components/FaqAccordion.tsx`, `app/faq/page.tsx`

- [ ] **Step 1: Create the accordion component**

Create `components/FaqAccordion.tsx`:

```tsx
"use client";

import { useState } from "react";

type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-800"
              aria-expanded={open}
            >
              {item.question}
              <span className="text-green-700">{open ? "−" : "+"}</span>
            </button>
            {open && <div className="px-5 pb-4 text-sm text-slate-600">{item.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create the FAQ page with JSON-LD structured data**

Create `app/faq/page.tsx`:

```tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Medicare FAQ",
  description: "Answers to common Medicare questions: enrollment periods, plan types, costs, and how to get help choosing coverage.",
};

const faqItems = [
  {
    question: "What is the difference between Medicare Advantage and Medicare Supplement?",
    answer:
      "Medicare Advantage (Part C) bundles your hospital, medical, and often drug coverage into one plan, typically through a private insurer network. Medicare Supplement (Medigap) works alongside Original Medicare to help cover out-of-pocket costs like copays and deductibles, and generally offers more flexibility in choosing providers.",
  },
  {
    question: "When can I enroll in Medicare?",
    answer:
      "Your Initial Enrollment Period (IEP) is a 7-month window around your 65th birthday. The Annual Enrollment Period (AEP) runs October 15 through December 7 each year. Special Enrollment Periods (SEP) may apply if you have a qualifying life event.",
  },
  {
    question: "Does it cost anything to talk to a Medicare advocate?",
    answer: "No, our Medicare education guidance is provided at no cost to you.",
  },
  {
    question: "Will I be pressured into buying a plan?",
    answer:
      "No. We are education-focused, not sales-driven. An advocate can walk you through your options, but the decision is always yours.",
  },
  {
    question: "What if I miss my enrollment window?",
    answer:
      "You may have to wait for the next enrollment period, or you may qualify for a Special Enrollment Period depending on your situation. An advocate can help you understand what applies to you.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-6">Medicare FAQ</h1>
        <FaqAccordion items={faqItems} />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/FaqAccordion.tsx app/faq
git commit -m "Add FAQ page with accordion UI and FAQPage structured data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 23: Educational SEO pages

**Files:**
- Create: `app/medicare-advantage/page.tsx`, `app/medicare-supplement/page.tsx`, `app/enrollment-periods/page.tsx`

- [ ] **Step 1: Medicare Advantage page**

Create `app/medicare-advantage/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Advantage (Part C) Explained",
  description:
    "Learn how Medicare Advantage plans work, what they cover, and how they compare to Medicare Supplement plans. Free, education-focused guidance.",
};

export default function MedicareAdvantagePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Advantage (Part C) Explained</h1>
        <p className="text-slate-700 mb-4">
          Medicare Advantage plans are offered by private insurers approved by Medicare. They bundle
          your Part A (hospital) and Part B (medical) coverage into a single plan, and many plans also
          include prescription drug coverage (Part D), plus extras like dental, vision, or hearing benefits.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">How it differs from Original Medicare</h2>
        <p className="text-slate-700 mb-4">
          Unlike Original Medicare, Medicare Advantage plans typically use a network of doctors and
          hospitals, similar to an HMO or PPO. Costs, coverage rules, and out-of-pocket maximums vary
          by plan and by where you live.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Is it right for you?</h2>
        <p className="text-slate-700 mb-4">
          It depends on your health needs, budget, and preferred doctors. Many people compare Medicare
          Advantage against{" "}
          <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
          plans before deciding. Understanding your{" "}
          <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment period</Link>{" "}
          also matters, since switching plans is generally easiest during specific windows.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Have questions about Medicare Advantage? Talk to a licensed advocate at no cost.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#intake-form" className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors">
              Request Guidance
            </Link>
            <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Medicare Supplement page**

Create `app/medicare-supplement/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Supplement (Medigap) Explained",
  description:
    "Learn how Medicare Supplement (Medigap) plans work alongside Original Medicare to help cover out-of-pocket costs. Free, education-focused guidance.",
};

export default function MedicareSupplementPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Supplement (Medigap) Explained</h1>
        <p className="text-slate-700 mb-4">
          Medicare Supplement, also called Medigap, is coverage sold by private insurers that works
          alongside Original Medicare (Parts A and B). It helps pay for costs Original Medicare
          doesn&apos;t cover, such as copayments, coinsurance, and deductibles.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">How it differs from Medicare Advantage</h2>
        <p className="text-slate-700 mb-4">
          Medigap plans generally let you see any doctor who accepts Medicare, nationwide, without
          needing referrals. They don&apos;t typically include drug coverage, so most people pair a
          Medigap plan with a separate Part D prescription drug plan. Compare this to{" "}
          <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>,
          which bundles coverage but usually restricts you to a network.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">When to enroll</h2>
        <p className="text-slate-700 mb-4">
          The best time to buy a Medigap policy is typically during your Medigap Open Enrollment
          Period, when you can't be denied coverage or charged more due to health conditions. See our{" "}
          <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment periods</Link>{" "}
          guide for details.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Not sure if Medigap is right for you? Talk to a licensed advocate at no cost.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#intake-form" className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors">
              Request Guidance
            </Link>
            <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Enrollment periods page**

Create `app/enrollment-periods/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Enrollment Periods Explained",
  description:
    "Understand the Initial, Annual, and Special Enrollment Periods for Medicare so you don't miss your window to enroll or change plans.",
};

export default function EnrollmentPeriodsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Enrollment Periods Explained</h1>
        <p className="text-slate-700 mb-4">
          Enrolling in Medicare — or changing your plan — is only possible during specific windows.
          Missing these can mean waiting months for your next chance, or paying a late enrollment penalty.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Initial Enrollment Period (IEP)</h2>
        <p className="text-slate-700 mb-4">
          A 7-month window: it starts 3 months before the month you turn 65, includes your birthday
          month, and extends 3 months after.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Annual Enrollment Period (AEP)</h2>
        <p className="text-slate-700 mb-4">
          Runs October 15 through December 7 every year. During this window you can switch between
          Original Medicare and{" "}
          <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>,
          change Advantage plans, or join/switch a Part D drug plan.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Special Enrollment Period (SEP)</h2>
        <p className="text-slate-700 mb-4">
          Triggered by qualifying life events — such as moving, losing employer coverage, or a plan
          leaving your area — that let you enroll or make changes outside the usual windows.
        </p>
        <p className="text-slate-700 mb-4">
          Not sure which window applies to your situation, or how it affects a{" "}
          <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
          decision? An advocate can walk you through it.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Find out which enrollment period applies to you — at no cost.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#intake-form" className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors">
              Request Guidance
            </Link>
            <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/medicare-advantage app/medicare-supplement app/enrollment-periods
git commit -m "Add SEO-optimized educational pages with internal linking

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 24: Sitemap and robots.txt

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`

- [ ] **Step 1: Create the sitemap**

Create `app/sitemap.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const routes = ["", "/faq", "/medicare-advantage", "/medicare-supplement", "/enrollment-periods"];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
```

- [ ] **Step 2: Create robots.txt**

Create `app/robots.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/agent", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "Add sitemap.xml and robots.txt for SEO

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 25: Login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the login page**

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSubmitting(false);

    if (res.status !== 200) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Login failed");
      return;
    }

    const body = (await res.json()) as { role: "ADMIN" | "AGENT" };
    router.push(body.role === "ADMIN" ? "/admin" : "/agent");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white border border-green-200 shadow-sm p-8 grid gap-4">
        <h1 className="text-xl font-bold text-green-800 text-center">Staff Login</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input id="password" name="password" type="password" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login
git commit -m "Add shared staff login page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 26: Admin layout and lead inbox

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/page.tsx`

- [ ] **Step 1: Create the admin layout with server-side auth guard**

Create `app/admin/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-bold text-green-800">Admin Dashboard</Link>
          <nav className="flex gap-4 text-sm text-slate-700">
            <Link href="/admin" className="hover:text-green-800">Leads</Link>
            <Link href="/admin/agents" className="hover:text-green-800">Agents</Link>
            <form action="/api/auth/logout" method="post">
              <button
                formAction={async () => {
                  "use server";
                }}
                type="submit"
                className="hover:text-green-800"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
```

Note: the sign-out button posts to `/api/auth/logout`; the empty `formAction` server action is a no-op placeholder Next.js requires for `formAction` typing on a plain `<form action=...>` — the actual POST happens via the form's own `action`/`method` attributes to the API route, not the server action. Verify this manually in Task 30 (e2e); if the button does not clear the cookie, replace it with a small client component that calls `fetch('/api/auth/logout', { method: 'POST' })` then `router.push('/login')`.

- [ ] **Step 2: Create the lead inbox page**

Create `app/admin/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminLeadsPage() {
  const leads = await db.lead.findMany({
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Lead Inbox</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{lead.fullName}</td>
                <td className="px-4 py-3">{lead.phone}</td>
                <td className="px-4 py-3">{lead.zip}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">{lead.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">{lead.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="text-green-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx
git commit -m "Add admin dashboard layout and lead inbox

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 27: Admin lead detail page (assign, payments, history)

**Files:**
- Create: `app/admin/leads/[id]/page.tsx`, `app/admin/leads/[id]/AssignForm.tsx`, `app/admin/leads/[id]/PaymentForm.tsx`

- [ ] **Step 1: Create the assign form (client component)**

Create `app/admin/leads/[id]/AssignForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Agent = { id: string; name: string; approved: boolean };

export default function AssignForm({ leadId, agents }: { leadId: string; agents: Agent[] }) {
  const router = useRouter();
  const [agentId, setAgentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!agentId) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/admin/leads/${leadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });

    setSubmitting(false);

    if (res.status !== 200) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Failed to assign");
      return;
    }

    router.refresh();
  }

  const approvedAgents = agents.filter((a) => a.approved);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="agentId" className="block text-sm font-medium text-slate-700 mb-1">Assign to agent</label>
        <select
          id="agentId"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 min-w-[220px]"
        >
          <option value="">Select an approved agent</option>
          {approvedAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || !agentId}
        className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
      >
        {submitting ? "Assigning..." : "Assign"}
      </button>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Create the payment form (client component)**

Create `app/admin/leads/[id]/PaymentForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Payment = { id: string; amount: number; type: string; status: "PAID" | "UNPAID" };

export default function PaymentForm({ leadId, payments }: { leadId: string; payments: Payment[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("SOLD");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await fetch(`/api/admin/leads/${leadId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), type }),
    });
    setSubmitting(false);
    setAmount("");
    router.refresh();
  }

  async function toggle(paymentId: string, current: "PAID" | "UNPAID") {
    await fetch(`/api/admin/leads/${leadId}/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "PAID" ? "UNPAID" : "PAID" }),
    });
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-4 divide-y divide-slate-100">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span>${p.amount.toFixed(2)} — {p.type}</span>
            <button
              onClick={() => toggle(p.id, p.status)}
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                p.status === "PAID" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {p.status}
            </button>
          </li>
        ))}
        {payments.length === 0 && <li className="py-2 text-sm text-slate-500">No payments recorded.</li>}
      </ul>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="BILLED">Billed</option>
            <option value="BOOKED">Booked</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          Add Payment
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create the lead detail server page**

Create `app/admin/leads/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AssignForm from "./AssignForm";
import PaymentForm from "./PaymentForm";

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead, agents, payments, notifications] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
        assignments: { orderBy: { createdAt: "desc" }, include: { toAgent: true, fromAgent: true, assignedBy: true } },
        callLogs: { orderBy: { createdAt: "desc" }, include: { agent: true } },
      },
    }),
    db.user.findMany({ where: { role: "AGENT" } }),
    db.payment.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
    db.notificationLog.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lead.fullName}</h1>
        <p className="text-slate-600">{lead.phone} · {lead.email ?? "no email"} · ZIP {lead.zip}</p>
        <span className="inline-block mt-2 rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
          {lead.status}
        </span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Assignment</h2>
        <p className="text-sm text-slate-600 mb-3">
          Currently assigned to: <strong>{lead.assignedTo?.name ?? "Unassigned"}</strong>
        </p>
        <AssignForm leadId={lead.id} agents={agents} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Payments</h2>
        <PaymentForm leadId={lead.id} payments={payments} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Status History</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.statusHistory.map((h) => (
            <li key={h.id} className="py-2">
              {h.fromStatus ?? "—"} → {h.toStatus} by {h.changedBy.name} at {h.createdAt.toLocaleString()}
            </li>
          ))}
          {lead.statusHistory.length === 0 && <li className="py-2 text-slate-500">No status changes yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Assignment Audit Trail</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.assignments.map((a) => (
            <li key={a.id} className="py-2">
              {a.fromAgent?.name ?? "Unassigned"} → {a.toAgent.name} by {a.assignedBy.name} at {a.createdAt.toLocaleString()}
            </li>
          ))}
          {lead.assignments.length === 0 && <li className="py-2 text-slate-500">No assignments yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Call Log</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.callLogs.map((c) => (
            <li key={c.id} className="py-2">
              {c.outcome} by {c.agent.name} at {c.createdAt.toLocaleString()}
              {c.notes ? ` — ${c.notes}` : ""}
            </li>
          ))}
          {lead.callLogs.length === 0 && <li className="py-2 text-slate-500">No calls logged yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Notification Log</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {notifications.map((n) => (
            <li key={n.id} className="py-2">
              {n.recipientType} via {n.channel}: {n.status} at {n.createdAt.toLocaleString()}
            </li>
          ))}
          {notifications.length === 0 && <li className="py-2 text-slate-500">No notifications sent yet.</li>}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/leads
git commit -m "Add admin lead detail page: assignment, payments, status history, call log, notification log

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 28: Admin agent management page

**Files:**
- Create: `app/admin/agents/page.tsx`, `app/admin/agents/AgentManager.tsx`

- [ ] **Step 1: Create the client-side agent manager**

Create `app/admin/agents/AgentManager.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Agent = { id: string; name: string; email: string; phone: string | null; approved: boolean; active: boolean };

export default function AgentManager({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSubmitting(false);

    if (res.status !== 201) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Failed to create agent");
      return;
    }

    form.reset();
    router.refresh();
  }

  async function toggleApproval(agentId: string, approved: boolean) {
    await fetch(`/api/admin/agents/${agentId}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Add Agent</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Full name" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="password" type="password" placeholder="Temporary password" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Agent"}
          </button>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Agents</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{agent.name}</td>
                <td className="px-4 py-2">{agent.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${agent.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {agent.approved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => toggleApproval(agent.id, agent.approved)} className="text-green-700 hover:underline">
                    {agent.approved ? "Revoke approval" : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

Create `app/admin/agents/page.tsx`:

```tsx
import { db } from "@/lib/db";
import AgentManager from "./AgentManager";

export default async function AdminAgentsPage() {
  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Agent Management</h1>
      <AgentManager agents={agents} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/agents
git commit -m "Add admin agent management page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 29: Agent portal (layout, lead list, lead detail)

**Files:**
- Create: `app/agent/layout.tsx`, `app/agent/page.tsx`, `app/agent/leads/[id]/page.tsx`, `app/agent/leads/[id]/LeadActions.tsx`

- [ ] **Step 1: Create the agent layout with auth guard and notification badge**

Create `app/agent/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  const unreadCount = await db.lead.count({ where: { assignedToId: user.id, status: "NEW" } });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link href="/agent" className="font-bold text-green-800 flex items-center gap-2">
            My Leads
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 text-white text-xs px-2 py-0.5">{unreadCount}</span>
            )}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm text-slate-700 hover:text-green-800">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create the agent lead list page**

Create `app/agent/page.tsx`:

```tsx
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export default async function AgentLeadsPage() {
  const user = await getSessionUser();
  const leads = await db.lead.findMany({
    where: { assignedToId: user!.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Leads</h1>
      <div className="grid gap-4">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/agent/leads/${lead.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-green-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{lead.fullName}</span>
              <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
                {lead.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{lead.phone} · ZIP {lead.zip}</p>
          </Link>
        ))}
        {leads.length === 0 && <p className="text-slate-500">No leads assigned to you yet.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the client component for status updates and call logging**

Create `app/agent/leads/[id]/LeadActions.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["NEW", "CONTACTED", "APPOINTMENT_SET", "SOLD", "CLOSED", "NOT_INTERESTED"];
const OUTCOMES = ["ANSWERED", "MISSED", "VOICEMAIL"];

export default function LeadActions({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [outcome, setOutcome] = useState("ANSWERED");
  const [notes, setNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingCall, setSavingCall] = useState(false);

  async function updateStatus(event: React.FormEvent) {
    event.preventDefault();
    setSavingStatus(true);
    await fetch(`/api/agent/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavingStatus(false);
    router.refresh();
  }

  async function logCall(event: React.FormEvent) {
    event.preventDefault();
    setSavingCall(true);
    await fetch(`/api/agent/leads/${leadId}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, notes }),
    });
    setSavingCall(false);
    setNotes("");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={updateStatus} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">Lead status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={savingStatus} className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60">
          {savingStatus ? "Saving..." : "Update Status"}
        </button>
      </form>

      <form onSubmit={logCall} className="rounded-xl border border-slate-200 bg-white p-6 grid gap-3">
        <h2 className="font-bold text-slate-900">Log a Call</h2>
        <div>
          <label htmlFor="outcome" className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
          <select id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <button type="submit" disabled={savingCall} className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60 w-fit">
          {savingCall ? "Saving..." : "Log Call"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create the agent lead detail server page**

Create `app/agent/leads/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import ClickToCallButton from "@/components/ClickToCallButton";
import LeadActions from "./LeadActions";

export default async function AgentLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();

  const lead = await db.lead.findFirst({
    where: { id, assignedToId: user!.id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      callLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lead.fullName}</h1>
        <p className="text-slate-600">{lead.phone} · {lead.email ?? "no email"} · ZIP {lead.zip}</p>
        {lead.notes && <p className="text-slate-600 mt-2">Notes: {lead.notes}</p>}
        <div className="mt-3">
          <ClickToCallButton
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800"
            label={`Call ${lead.fullName}`}
          />
        </div>
      </div>

      <LeadActions leadId={lead.id} currentStatus={lead.status} />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Call History</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.callLogs.map((c) => (
            <li key={c.id} className="py-2">
              {c.outcome} at {c.createdAt.toLocaleString()}{c.notes ? ` — ${c.notes}` : ""}
            </li>
          ))}
          {lead.callLogs.length === 0 && <li className="py-2 text-slate-500">No calls logged yet.</li>}
        </ul>
      </section>
    </div>
  );
}
```

Note: `ClickToCallButton` uses `label={...lead.fullName}` on a lead's real phone number by way of the shared business number pattern — since the agent must call the *lead's* number, not the business line, update `ClickToCallButton` usage here to link `tel:${lead.phone}` directly instead of the business phone. Fix in Step 5 below.

- [ ] **Step 5: Fix ClickToCallButton to support a custom phone number**

Modify `components/ClickToCallButton.tsx` (from Task 19) to accept an optional `phone` override:

```tsx
type Props = {
  className?: string;
  label?: string;
  phone?: string;
};

export default function ClickToCallButton({ className, label, phone }: Props) {
  const resolvedPhone = phone ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+18005551234";
  const display = phone ?? process.env.NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY ?? "(800) 555-1234";

  return (
    <a
      href={`tel:${resolvedPhone}`}
      className={
        className ??
        "inline-block rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
      }
    >
      {label ?? `Call ${display}`}
    </a>
  );
}
```

Then update `app/agent/leads/[id]/page.tsx`'s `ClickToCallButton` usage to pass the lead's own number:

```tsx
          <ClickToCallButton
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800"
            label={`Call ${lead.fullName}`}
            phone={lead.phone}
          />
```

- [ ] **Step 6: Commit**

```bash
git add app/agent components/ClickToCallButton.tsx
git commit -m "Add agent portal: lead list, lead detail, status updates, call logging

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 30: Full verification run

**Files:** none created; this task verifies the whole system end-to-end.

- [ ] **Step 1: Run the full automated test suite**

```bash
npm test
```

Expected: all test files pass (auth, session, validation, notifications, api-leads, api-auth, api-agents, api-assign, api-payments, api-agent-leads, api-status, api-calls).

- [ ] **Step 2: Run a production build to catch type errors**

```bash
npm run build
```

Expected: build completes with no TypeScript or lint errors. If the `formAction` no-op in `app/admin/layout.tsx` (Task 26, Step 1) causes a build error or does not clear the session cookie in Step 5 below, replace the admin sign-out button with a small client component:

Create `app/admin/SignOutButton.tsx` (only if needed):

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="text-sm text-slate-700 hover:text-green-800">
      Sign out
    </button>
  );
}
```

And replace the `<form action="/api/auth/logout" ...>` block in `app/admin/layout.tsx` with `<SignOutButton />` (imported at the top of the file).

- [ ] **Step 3: Seed the dev database with a clean admin account**

```bash
rm -f prisma/dev.db
npx prisma migrate deploy
npm run db:seed
```

Expected: `Created admin account: admin@example.com / ChangeMe123!`

- [ ] **Step 4: Start the app and walk the full acceptance-criteria flow using the webapp-testing skill**

Invoke the `webapp-testing` skill to drive this manually with Playwright against `npm run dev` on `http://localhost:3000`:

1. Visit `/` — confirm the hero says "Medicare Education & Coverage Guidance", the click-to-call link has `href="tel:+18005551234"`, and internal links to `/medicare-advantage`, `/medicare-supplement`, `/enrollment-periods`, `/faq` all resolve to 200.
2. Submit the intake form with a valid name/phone/zip/email. Confirm the "Thank you!" confirmation appears.
3. Log in at `/login` as `admin@example.com` / `ChangeMe123!`. Confirm redirect to `/admin` and the new lead appears in the inbox with status `NEW`.
4. Go to `/admin/agents`, create an agent (e.g. `agent1@example.com` / `AgentPass123!`), then approve them.
5. Go back to the lead in `/admin/leads/[id]`, assign it to the new agent. Confirm the "Assignment" section now shows the agent's name, and the "Notification Log" section shows one `AGENT`/`IN_APP`/`SENT` entry and one `LEAD`/`EMAIL`/`SENT` entry (since the test lead had an email).
6. Log out, log back in as the agent. Confirm `/agent` shows exactly this one lead and the header shows an unread badge.
7. Open the lead, click "Call {name}" and confirm the link's `href` is `tel:` followed by the lead's own phone number (not the business number).
8. Update the status to `CONTACTED`, then log a call with outcome `MISSED`. Confirm both actions succeed and reflect immediately in the UI.
9. Log back in as admin, open the same lead, and confirm the "Status History" section shows `NEW → CONTACTED` and the "Call Log" section shows the `MISSED` entry.
10. Add a payment of `$50` type `SOLD`. Confirm it appears as `UNPAID`, then click it to toggle to `PAID`.
11. As a negative access-control check: while still logged in as the agent from step 6, attempt `fetch('/api/admin/leads')` from the browser console (or via `curl` with the agent's session cookie) and confirm it returns `403`.

Record the outcome of each numbered check. If any check fails, fix the underlying code (not the test) and re-run the full sequence from step 1.

- [ ] **Step 5: Commit any fixes discovered during verification**

```bash
git add -A
git commit -m "Fix issues found during end-to-end verification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Only run this commit if Step 4 required code changes — do not create an empty commit.)

---

## Task 31: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write setup and usage instructions**

Create `README.md`:

```markdown
# Medicare Lead Generation Website + CRM

An SEO-optimized Medicare education landing page with a lightweight built-in CRM:
lead capture, admin lead assignment, agent portal, status tracking, call logging,
and payment tracking.

## Stack

Next.js 14 (App Router, TypeScript) + Prisma/SQLite + Tailwind CSS. No paid
subscriptions required.

## Setup

\`\`\`bash
npm install
cp .env.example .env   # if present; otherwise edit .env directly
npx prisma migrate deploy
npm run db:seed
npm run dev
\`\`\`

Visit http://localhost:3000 for the public site, and http://localhost:3000/login
to sign in as the seeded admin (`admin@example.com` / `ChangeMe123!` by default —
override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars before seeding,
and change the password immediately in production).

## Testing

\`\`\`bash
npm test        # unit + integration tests (Vitest)
npm run build   # type-checks the whole app
\`\`\`

## Environment variables

- `DATABASE_URL` — SQLite file path.
- `SESSION_SECRET` — HMAC secret for signing session cookies. Generate a long
  random value for production.
- `NEXT_PUBLIC_BUSINESS_PHONE` / `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` — the
  click-to-call number shown on the public site.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL used in metadata and the sitemap.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with setup and testing instructions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage:** Lead capture (Tasks 8, 11, 19-21) ✓; lead assignment + agent
access restriction (Tasks 14, 16) ✓; status tracking with audit trail (Tasks
17, 27) ✓; payment tracking (Tasks 15, 27) ✓; click-to-call (Tasks 19, 29) ✓;
dual notification on assignment (Tasks 9, 14) ✓; call handling / missed call
visibility for reassignment (Tasks 18, 27) ✓; SEO (Tasks 21-24) ✓; mobile-
friendly/simple UI (Tailwind throughout) ✓; secure login storage (Tasks 5, 6)
✓; acceptance criteria walkthrough (Task 30) ✓.

**Known follow-up flagged in-plan:** the admin sign-out `<form>` pattern in
Task 26 has a documented fallback (`SignOutButton.tsx`) if the plain HTML form
submit doesn't reliably clear the cookie — verified and fixed if needed in Task 30.
