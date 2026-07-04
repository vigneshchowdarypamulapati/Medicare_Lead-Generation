# Deploying to Vercel

This app runs on Vercel (Next.js) with a Neon Postgres database. Once the GitHub
repo is connected, **every push to `main` deploys automatically**.

## One-time setup

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New → Project**, then import `Medicare_Lead-Generation`.
3. Vercel auto-detects Next.js — leave the build settings as-is (the build
   command runs `prisma generate && next build`).
4. Before the first deploy, add the environment variables below
   (**Settings → Environment Variables**), for the Production (and Preview) scope.
5. Deploy.

## Environment variables (set in Vercel, not in git)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (hostname has `-pooler`) |
| `DIRECT_URL` | Neon **direct** connection string (no `-pooler`) |
| `SESSION_SECRET` | A long random secret — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Do not reuse the dev value.** |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Click-to-call number, e.g. `+18005551234` |
| `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` | Display form, e.g. `(800) 555-1234` |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

`TEST_DATABASE_URL` is **not** needed on Vercel — it is only for running the test
suite locally.

## Future updates

- Make changes locally, run `npm test` and `npm run build`, commit, and
  `git push origin main`. Vercel builds and deploys the new version automatically.
- **If a change includes a schema migration**, apply it to Neon before (or right
  after) pushing, from your machine:
  ```bash
  npx prisma migrate deploy
  ```
  Vercel's build only runs `prisma generate`, never migrations, so the production
  database schema is always changed deliberately from your machine — never
  silently on deploy.

## Notes

- The seeded admin account exists only if you ran `npm run db:seed` against the
  production Neon database. Do that once, then change the password.
- Neon free-tier databases cold-start after inactivity, adding ~1s to the first
  request after idle; requests are never dropped.
