# Medicare Lead Generation Website + Lightweight CRM — Design Spec

**Date:** 2026-07-03
**Status:** Approved by user

## Purpose

Capture leads from an SEO-friendly Medicare education landing page, assign them to
approved agents, track their progress through a sales pipeline, and record payment
activity — all in one low-cost, self-hosted system with no paid subscriptions.

## Stack

- **Framework:** Next.js 14+ (App Router) — server-rendered public pages for SEO,
  API route handlers for the CRM backend.
- **Database:** SQLite via Prisma ORM (file-based, zero cost, portable).
- **Styling:** Tailwind CSS.
- **Auth:** Email/password with bcrypt-hashed passwords and signed, HTTP-only
  session cookies. No third-party auth service.
- **Runs with:** `npm run dev` locally; deployable to any Node host later.

## Public Site (SEO)

### Pages

| Route | Purpose |
|---|---|
| `/` | Main landing page: hero ("Medicare Education & Coverage Guidance", green education-focused theme, "Education-focused, not sales-driven" tagline), service description, how-it-works, trust signals, FAQ, intake form, click-to-call CTAs |
| `/medicare-advantage` | Educational page on Medicare Advantage (Part C) |
| `/medicare-supplement` | Educational page on Medigap/supplement plans |
| `/enrollment-periods` | Educational page on IEP/AEP/SEP enrollment windows |
| `/faq` | Expanded FAQ page |

### SEO requirements

- Server-rendered/static HTML, semantic markup, fast load, mobile-friendly.
- Unique title/meta description per page, Open Graph tags.
- FAQ structured data (schema.org `FAQPage` JSON-LD) on the landing page.
- Internal links: every educational page links to related pages and funnels to
  the landing page form with CTAs.
- `sitemap.xml` and `robots.txt`.
- Target keywords: medicare plans, medicare enrollment, medicare advantage vs
  supplement, medicare coverage guidance, medicare help.

### Intake form

Fields: full name*, phone*, email, ZIP code*, age bracket, current coverage,
preferred contact time, notes. (* = required)

- Client-side and server-side validation (required fields, phone/email format).
- Successful submission creates a `Lead` with status `NEW` and shows a
  confirmation message.
- Honeypot field for basic spam protection.

### Call-to-action

- Click-to-call button (`tel:` link) in the hero, sticky header, and footer.
- Form submission as the primary conversion CTA.

## Roles & Access

- **Admin:** full visibility — all leads, agents, payments, call logs, audit trail.
- **Agent:** sees ONLY leads assigned to them; enforced server-side on every
  query and API route (never client-side only).
- Seed script creates the initial admin account. Admin creates agent accounts;
  agents have an `approved` flag — only approved agents can be assigned leads
  and log in.

## Admin Dashboard (`/admin`)

- Lead inbox: all leads, filterable by status/agent, sortable by date.
- Assign or reassign a lead to any approved agent (recorded in audit trail).
- Lead detail: full info, status history with timestamps, call log, payments.
- Payment tracking: create a payment record on a lead (amount, type:
  billed/booked/sold, status: paid/unpaid); toggle paid/unpaid.
- Call log view including missed calls, with quick reassign for unresponsive leads.
- Agent management: create, approve/unapprove, deactivate agents.

## Agent Portal (`/agent`)

- List of assigned leads only, with status and contact info.
- Lead detail: click-to-call the lead, update status, log call outcomes
  (answered / missed / voicemail), add notes.
- Status pipeline: `NEW → CONTACTED → APPOINTMENT_SET → SOLD → CLOSED`
  (agent can also mark `NOT_INTERESTED`). Every change timestamped and recorded.
- In-app notification badge when a new lead is assigned. Email notification is a
  stubbed function ready for SMTP config later (out of MVP scope).

## Data Model

- **User**: id, name, email (unique), passwordHash, role (ADMIN|AGENT), phone,
  approved (bool), active (bool), createdAt.
- **Lead**: id, fullName, phone, email?, zip, ageBracket?, currentCoverage?,
  preferredContactTime?, notes?, status, assignedToId?, createdAt, updatedAt.
- **StatusHistory**: id, leadId, fromStatus, toStatus, changedById, createdAt.
- **Assignment**: id, leadId, fromAgentId?, toAgentId, assignedById, createdAt.
- **Payment**: id, leadId, amount, type (BILLED|BOOKED|SOLD), status
  (PAID|UNPAID), createdById, createdAt, updatedAt.
- **CallLog**: id, leadId, agentId, outcome (ANSWERED|MISSED|VOICEMAIL), notes?,
  createdAt.

## Call Handling (MVP)

- Public click-to-call rings the business line (configurable number).
- Agent-side click-to-call dials the lead from the agent's phone.
- Agents log every call outcome; missed/unanswered calls appear in the admin
  call log so the admin can reassign the lead.
- Real telephony (Twilio routing, voicemail capture) is explicitly out of scope;
  voicemail is handled by the phone carrier.

## Non-Functional

- Mobile-friendly responsive design throughout (public site and portals).
- Fast: static/server-rendered public pages, no heavy client JS on the landing page.
- Secure: hashed passwords, HTTP-only signed session cookies, server-side
  authorization on every mutation, input validation on all forms.
- Simple: minimal dependencies, one repo, one database file.

## Out of Scope (per requirements PDF)

Custom mobile apps, commission engines, real-time performance dashboards,
complex workflow automation, enterprise integrations, real telephony routing,
online payment processing (Stripe later if needed).

## Acceptance Criteria (from requirements PDF)

1. A visitor can submit the form successfully.
2. The lead appears in the admin dashboard automatically.
3. An admin can assign the lead to an agent.
4. The agent can update lead progress.
5. The admin can see whether the lead is active and its current status.
6. A payment record can be created and tracked (paid/unpaid).
7. The system launches without custom enterprise software.

## Testing Strategy

- End-to-end browser verification of: form submission → lead creation → admin
  assignment → agent status update → audit trail → payment record.
- Access-control check: agent A cannot see or modify agent B's leads (direct
  URL and API attempts).
- Form validation: required fields rejected server-side when bypassing client checks.
