# AIVized Lead Tracker

A team lead tracker for LinkedIn, WhatsApp and Facebook outreach. Employees log
first messages, day 3/7/14 follow-ups, replies and milestones. The follow-up
engine and dashboards are driven by an activity ledger stored in PostgreSQL.

## Features & benefits

- **Automatic day 3/7/14 follow-up engine** — log one message and the app
  schedules every follow-up for you. Nothing slips through the cracks and no
  one has to remember dates or use a spreadsheet.
- **Follow-ups due on the dashboard** — today's and overdue follow-ups appear
  with a one-click "Mark follow-up sent" button, so employees always know
  exactly what to do next.
- **Team-wide duplicate protection** — the same profile URL or business name is
  blocked across the whole team, so two employees never contact the same client
  twice. Admins can explicitly allow a duplicate when needed.
- **Employee dashboard with charts** — messages per day, funnel and reply
  breakdowns keep each person focused on their own pipeline.
- **Admin team overview** — KPIs, messages-per-employee-per-day chart and
  table, sortable performance table, leaderboard, funnel, channel results and
  follow-up health, filterable by date range and employee.
- **Reply tracking with tags** — logging a reply stops the sequence at once,
  and the admin Replies view (plus a "No reply" tab) shows every conversation
  with employee, channel, tag and date filters.
- **Message templates** — copy-ready templates for every channel with
  `[Name]` and `[Business]` auto-filled from the selected lead.
- **Excel import with column mapping** — upload `.xlsx` or `.csv`, map the
  columns, preview 20 rows, then import. Duplicates, validation errors and
  skipped rows are reported and downloadable as CSV.
- **Styled Excel export** — one-click exports of your leads and activities, or
  selected rows only; admins get a team-wide workbook plus a full JSON backup
  including users, templates, settings and audit history.
- **Roles and approval gate** — the verified `ADMIN_EMAIL` becomes admin,
  other sign-ups become employees, and an optional "Require admin approval"
  setting holds new accounts as pending. Deactivated users lose access while
  their data is retained.
- **Lead reassignment and soft delete** — admins can reassign one or many
  leads, soft delete, and view any employee's read-only dashboard, leads and
  activity log.
- **Configurable settings** — time zone, daily new-lead/message targets,
  follow-up schedule, no-reply threshold, approval gate and all template copy
  are controlled from the admin Settings page and apply immediately.
- **Automatic no-reply detection** — leads that go silent past the configured
  threshold are flagged on page load and by a `CRON_SECRET`-protected daily
  cron, keeping the pipeline tidy without manual review.
- **Complete audit log** — deletes, status changes, reassignments, settings and
  template edits, imports and exports are all recorded in a paginated viewer.
- **Privacy-first and secure by default** — signature-verified Clerk webhook,
  security headers, rate-limited writes, escaped rendering, no personal data
  in server logs, and all data stored in Postgres (never on disk). A privacy
  and messaging-rules notice is built into the app.
- **Light/dark mode with AIVized branding** — a responsive app shell with
  collapsible sidebar, mobile drawer and a `prefers-color-scheme` fallback.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui-style components (Radix primitives)
- Clerk for sign-up, login and sessions
- PostgreSQL (Neon-compatible) + Drizzle ORM and migrations
- Zod validation
- Recharts charts
- date-fns / date-fns-tz for time zones
- Vitest for follow-up, settings and import/export tests

## Getting started

### 1. Requirements

- Node.js 22+ (24 recommended)
- A PostgreSQL database (Neon via the Vercel Marketplace, or local Postgres)
- A Clerk application

### 2. Install

```bash
npm install
```

### 3. Environment

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres runtime connection string |
| `DATABASE_URL_UNPOOLED` | Optional direct URL for migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret for the Clerk webhook |
| `ADMIN_EMAIL` | The one verified email that becomes admin |
| `CRON_SECRET` | Bearer secret for the daily no-reply cron route |
| `APP_TIMEZONE` | Default `Asia/Karachi` |

Never commit `.env`, `.env.local`, or any secret. `.env.example` is committed on
purpose and contains placeholders only.

### 4. Create the database schema

```bash
npm run db:generate   # only needed after schema changes
npm run db:migrate
npm run db:seed
```

`db:seed` creates the single settings row and the default message templates. It
does **not** create demo clients; sample data is only ever enabled explicitly
(`SEED_SAMPLE_DATA=true`) and is off by default.

For quick local iteration you can use `npm run db:push` instead of migrations.

### Local PostgreSQL on Windows (no Neon account needed)

The repository includes a local database helper for development:

```bash
npm run db:local:init
```

This creates `.localdb/` (git-ignored), starts PostgreSQL on port `5433`, and
creates a `leadm` database with trust auth bound to localhost. Then set:

```dotenv
DATABASE_URL="postgresql://postgres@localhost:5433/leadm"
```

and run `npm run db:migrate` and `npm run db:seed`. Other commands:
`db:local:start`, `db:local:stop`, `db:local:status` and `db:local:reset`.
**Restart `npm run dev` after changing `.env`/`.env.local`**; the Postgres client
is created once at server startup. Replace this URL with Neon before deploying;
`.localdb/` is only for local development.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Clerk setup

1. Create a Clerk application and enable email sign-in.
2. Copy the publishable and secret keys into `.env.local`.
3. Add a webhook pointing to `https://YOUR-DOMAIN/api/webhooks/clerk` and
   subscribe to `user.created`, `user.updated`, `user.deleted`.
4. Copy the webhook signing secret into `CLERK_WEBHOOK_SECRET`.

Sign up with the address in `ADMIN_EMAIL` to become the admin. Every other
verified sign-up becomes an employee. New employees are auto-approved
(`active`) while **Require admin approval** is off in Settings; enable that
setting only if you want new accounts held as `pending`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run vercel-build` | Vercel build: migrate, seed defaults, then build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript with no emit |
| `npm test` | Vitest unit tests (DB tests skip without `TEST_DATABASE_URL`) |
| `npm run test:integration` | Recreate `leadm_test`, migrate, and run all tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:seed` | Seed settings + templates |

## How it works

### Testing

`npm test` runs the fast unit suite. `npm run test:integration` expects the
local database helper (or any `TEST_DATABASE_URL`) and:

1. drops and recreates a database whose name ends in `_test` (never a
   production name),
2. applies migrations, and
3. runs the full suite against that isolated database.

The integration suite covers role assignment/approval/deactivation, team-wide
duplicate detection, employee vs. admin dashboard aggregates, follow-up and
reply transitions, cross-employee read/write rejection, import duplicate/failed
row reporting, workbook round-trip, and the protected no-reply cron.

### Roles

- `ADMIN_EMAIL` (verified) → `admin`, always `active`.
- Everyone else → `employee`.
- `require_approval` (settings, off by default) makes new employees `pending`.
- Deactivated employees cannot use the app; their data is retained.
- Roles are stored in Clerk `publicMetadata.role` and mirrored in `users`.
- The Clerk webhook is signature-verified with svix. A first-login fallback also
  creates the database user if the webhook has not run yet.

### Follow-up rules

- First message → `contacted`, stage `0`, next follow-up = send date + 3 days.
- Day 3 follow-up → stage `1`, next in 4 days (day 7 from contact).
- Day 7 follow-up → stage `2`, next in 7 days (day 14 from contact).
- Day 14 follow-up → stage `3`, no next follow-up.
- A reply at any time → `replied`, next follow-up cleared, sequence stopped.
- No reply for `no_reply_after_days` after the last message → `no_reply`.
  This is recomputed when the dashboard and leads pages load and by the secured
  daily cron at `/api/cron/daily` (01:00 UTC via `vercel.json`).

All timestamps are stored in UTC. Day boundaries use the time zone from
settings (seeded from `APP_TIMEZONE`, default `Asia/Karachi`).

### Duplicate protection

On create and update, the app checks the whole team for:

- the same normalized `profile_url`, or
- the same business name (case-insensitive).

The employee is told who owns the duplicate and the save is blocked. On the
admin team-leads screen, the admin can tick **Allow this duplicate** in the edit
form to save anyway.

### Data scoping

Every employee page and server action filters by `owner_id`. Admins are allowed
to view any lead. Admin routes call `requireAdmin()`; deactivated users are
redirected to `/pending`.

## Employee guide

1. Sign up / sign in. If approval is required, wait on the pending screen.
2. Open **Leads** and add your first lead. Business name is required.
3. Log the first message from the row menu. The app sets the next follow-up.
4. On the **Dashboard**, follow-ups due today or overdue appear with a one-click
   "Mark follow-up sent" button.
5. When a client replies, use **Log reply** and add the reply text and tag. This
   stops the sequence.
6. Use **Templates** to copy the right message for the channel. Choose a lead
   first to fill `[Name]` and `[Business]`.
7. Use **Import** on Leads to upload `.xlsx` or `.csv`. Map the columns, preview
   the first 20 rows, then import. Duplicates, validation errors and skipped
   rows are reported; problem rows can be downloaded as CSV.
8. Use **Export** for all your leads and activities as a styled Excel workbook,
   or select rows and choose **Export selected**.
9. Read **Privacy & messaging rules** in the sidebar before importing or
   contacting leads; you must follow the privacy and anti-spam laws of every
   country you message.

## Admin guide

1. Sign up with `ADMIN_EMAIL` and open `/admin`.
2. **Team overview** shows team KPIs, messages per employee per day (chart and
   table), a sortable performance table, leaderboard, funnel, channel results,
   top industries/services, and follow-up health. Use the date range and
   employee filters at the top.
3. **Replies** lists every client reply with employee, channel, tag and date
   filters, plus a **No reply** tab where stale leads can be sent back for
   follow-up or reassigned.
4. **Employees** lists accounts and lead counts. Approve pending users,
   deactivate/reactivate access, and open any employee's read-only dashboard,
   leads and activity log.
5. **Team leads** is the team-wide lead table. Filter by owner, edit any lead,
   soft delete, and reassign one or many leads. The edit form has an admin-only
   duplicate override.
6. **Settings** controls the time zone, daily new-lead/message targets,
   follow-up schedule, no-reply threshold, approval gate, and the copy for all
   message templates. Changes take effect immediately for employees.
7. **Export all data** on Settings downloads a styled Excel workbook with Leads,
   Activities, Replies and a 30-day Employee Summary. The **JSON backup** button
   also includes users, templates, settings and audit history.
8. **Audit log** records lead deletes, employee status changes, reassignments,
   settings changes, template edits, imports and exports. The Settings page links
   to the paginated viewer.

## Deployment (Vercel)

1. Push the repository to GitHub and import it into Vercel.
2. Add a Neon Postgres database from the Vercel Marketplace. Set
   `DATABASE_URL` to the pooled runtime connection string. If Neon provides a
   direct/unpooled URL, set `DATABASE_URL_UNPOOLED` too; migrations prefer it
   and otherwise fall back to `DATABASE_URL`.
3. Create a Clerk **production** application, enable email sign-in, and copy
   the publishable/secret keys. Add `https://YOUR-DOMAIN` to the allowed
   origins/redirect URLs.
4. Add a Clerk webhook at `https://YOUR-DOMAIN/api/webhooks/clerk`, subscribe
   to `user.created`, `user.updated`, and `user.deleted`, then copy its signing
   secret to `CLERK_WEBHOOK_SECRET`.
5. Add all environment variables in Vercel: `DATABASE_URL`,
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `CLERK_WEBHOOK_SECRET`, `ADMIN_EMAIL`, `APP_TIMEZONE`, and a strong random
   `CRON_SECRET`. Vercel sends the cron secret as
   `Authorization: Bearer <CRON_SECRET>`.
6. Deploy. Vercel automatically runs `npm run vercel-build`, which applies
   Drizzle migrations, inserts missing default settings/templates, and builds
   the app. It is safe to re-run and does not overwrite edited templates.
7. Sign up with the verified `ADMIN_EMAIL` address to become the admin.
8. Invite employees to the sign-up page. They are auto-approved unless
   **Require admin approval** is enabled in Settings.
9. Verify sign-in, a lead create/update, the Employees page, an Excel export,
   the Clerk webhook delivery, and `/api/cron/daily` with the cron secret.

The privacy notice is available at `/privacy` and is linked from the app
sidebar. Review it (and your local messaging laws) before going live.

The app never writes application data to the local file system; everything
lives in Postgres. `vercel.json` registers the daily cron at 01:00 UTC; Vercel
authenticates it automatically with the `CRON_SECRET` environment variable.

## Project structure

```
app/
  (app)/            Employee shell: dashboard, leads, templates
  admin/            Team overview, replies, employees, leads, settings, audit
  api/admin/export  Admin Excel export / JSON backup
  api/cron/daily    CRON_SECRET-protected no-reply recomputation
  api/export        Employee Excel export (own data)
  api/import-template  Downloadable .xlsx import template
  api/webhooks/     Clerk webhook (svix verified)
  pending/          Approval / deactivated screen
  privacy/          Privacy and messaging-rules notice
  sign-in, sign-up  Clerk pages in brand style
actions/            Server actions (leads, activities, admin, settings, import)
components/         UI primitives, shell, dashboard, leads, templates
db/                 Drizzle schema, client, seed, migrations
lib/                Auth, follow-up engine, queries, validation, helpers
scripts/            Local database + integration-test helpers
tests/              Unit and database-backed acceptance tests
```
