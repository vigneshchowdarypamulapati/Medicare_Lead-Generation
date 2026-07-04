# Medicare Lead Generation Website + CRM

An SEO-optimized Medicare education landing page with a lightweight built-in CRM:
lead capture, admin lead assignment, agent portal, status tracking, call logging,
and payment tracking.

## Stack

Next.js 14 (App Router, TypeScript) + Prisma/SQLite + Tailwind CSS. No paid
subscriptions required.

## Setup

```bash
npm install
cp .env.example .env
# Then edit .env and set SESSION_SECRET to a long, random value, e.g.:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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
npm test        # unit + integration tests (Vitest)
npm run build   # type-checks the whole app
```

## Environment variables

- `DATABASE_URL` — SQLite file path.
- `SESSION_SECRET` — HMAC secret for signing session cookies. Generate a long
  random value for production (never reuse the placeholder from `.env.example`).
- `NEXT_PUBLIC_BUSINESS_PHONE` / `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` — the
  click-to-call number shown on the public site.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL used in metadata and the sitemap.
