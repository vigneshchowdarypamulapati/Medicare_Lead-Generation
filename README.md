# Medicare Lead Generation Website + CRM

An SEO-optimized Medicare education landing page with a lightweight built-in CRM:
lead capture, admin lead assignment, agent portal, status tracking, call logging,
and payment tracking.

## Stack

Next.js 14 (App Router, TypeScript) + Prisma + Neon Postgres + Tailwind CSS.
Runs entirely on free tiers.

## Setup

1. Create a free Postgres project at [neon.tech](https://neon.tech). From the
   Connect dialog copy both the **pooled** connection string (hostname contains
   `-pooler`) and the **direct** one. For running tests, also create a second
   branch (e.g. `test`) and copy its connection string.

2. Then:

```bash
npm install
cp .env.example .env
# Edit .env:
#   DATABASE_URL      = pooled Neon connection string
#   DIRECT_URL        = direct Neon connection string (used by migrations)
#   TEST_DATABASE_URL = the test branch's connection string (tests wipe its data)
#   SESSION_SECRET    = long random value, e.g.:
#     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Visit http://localhost:3000 for the public site, and http://localhost:3000/login
to sign in as the seeded admin (`admin@example.com` / `ChangeMe123!` by default —
override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars before seeding,
and change the password immediately in production).

## Testing

```bash
npm test        # unit + integration tests (Vitest, runs against TEST_DATABASE_URL)
npm run build   # type-checks the whole app
```

Tests refuse to run if `TEST_DATABASE_URL` is missing or points at the same
database as `DATABASE_URL`, and they truncate every table between tests — never
point it at a database with real data.

## Environment variables

- `DATABASE_URL` — Neon pooled connection string (the app's runtime connection).
- `DIRECT_URL` — Neon direct connection string (used by Prisma migrations).
- `TEST_DATABASE_URL` — separate Neon branch used only by the test suite.
- `SESSION_SECRET` — HMAC secret for signing session cookies. Generate a long
  random value for production (never reuse the placeholder from `.env.example`).
- `NEXT_PUBLIC_BUSINESS_PHONE` / `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` — the
  click-to-call number shown on the public site.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL used in metadata and the sitemap.
