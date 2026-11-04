# AIVized Lead Tracker — Phased Build Plan

This plan divides `requirements.md` into sequential, independently verifiable phases. Every original requirement (sections 1–16) and every acceptance-checklist item is mapped in the **Traceability Matrix** at the end, so nothing is missed.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done. Each phase lists **Tasks**, **Deliverables**, and **Exit criteria** (definition of done).

> **Build status:** All phases (0-12) are implemented and documented. Automated unit and database-backed acceptance/security tests pass, and the production build succeeds locally. The only external step is a Vercel preview smoke test, which requires the deployer's Neon and Clerk credentials; it is documented in the README. Migrations, seed, follow-up/no-reply logic, dashboard queries, admin aggregates, settings/template persistence, audit pagination, worksheet styling, CSV/XLSX import, duplicate skipping and failed-row reporting were exercised against a throwaway local PostgreSQL 18 instance.

---

## Phase 0 — Project Foundation and Tooling

**Goal:** A deployable Next.js skeleton with the exact stack, config, and environment contract.

### Tasks
- [x] Initialize Next.js (latest stable, App Router) with TypeScript.
- [x] Configure Tailwind CSS and initialize shadcn/ui.
- [x] Install and pin the required dependencies: `drizzle-orm`, `drizzle-kit`, `postgres`/`pg` driver, `zod`, `recharts`, `exceljs`, `csv-parse` (or equivalent CSV parser), `svix`, `date-fns`, `date-fns-tz`, Clerk SDK (`@clerk/nextjs`), plus test tooling (Vitest or Jest).
- [x] Set up `tsconfig` path aliases, ESLint, Prettier (or repo convention), and strict TypeScript.
- [x] Create a clean folder structure (`app/`, `components/`, `lib/`, `db/`, `actions/`, `tests/`).
- [x] Create `.env.example` with every required variable:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  - `CLERK_WEBHOOK_SECRET`
  - `ADMIN_EMAIL`
  - `CRON_SECRET`
  - `APP_TIMEZONE` (default `Asia/Karachi`)
- [x] Scaffold `vercel.json` (to be completed with the cron job in Phase 10).
- [x] Scaffold `README.md` sections for setup and deployment (filled in Phase 12).
- [x] Confirm the app builds and runs locally with `npm run dev` and `npm run build`.
- [x] Document sensible default choices in the README (as required by section 1).

### Deliverables
- Buildable Next.js + TypeScript + Tailwind + shadcn project.
- `.env.example`, `vercel.json`, initial README, dependency lockfile.

### Exit criteria
- `npm run build` succeeds with no placeholder errors.
- Every tech-stack item from section 2 is installed and wired.
- No local-file-system persistence is used for app data.

---

## Phase 1 — Database, Schema, Migrations, and Seed

**Goal:** The complete PostgreSQL data model with indexes, migrations, and seed data.

### Tasks
- [x] Configure Drizzle ORM for PostgreSQL (Neon-compatible connection).
- [x] Define the `users` table: `id` (uuid PK), `clerk_id` (unique), `email`, `full_name`, `avatar_url`, `role` (`admin`/`employee`), `status` (`active`/`pending`/`deactivated`), `last_seen_at`, `created_at`.
- [x] Define the `leads` table with every column and enum:
  - `id` (uuid), `owner_id` (FK → users), `contact_name`, `business_name` (required)
  - `job_title`, `industry`, `country`
  - `channel` (`linkedin`/`whatsapp`/`facebook`/`other`)
  - `source` (free text, e.g. LinkedIn search, Google Maps, job post, referral, event)
  - `profile_url` (normalized for duplicate checks), `email`, `phone`
  - `observation`, `service_pitched` (`AI Systems`/`Automations`/`SEO & GEO`/`Digital Marketing`/`Web Development`/`Desktop Software`/`other`)
  - `status` (`new`/`contacted`/`replied`/`call_booked`/`proposal_sent`/`won`/`lost`/`no_reply`)
  - `next_follow_up_at`, `follow_up_stage` (0–3), `notes`
  - `deleted_at` (soft delete), `created_at`, `updated_at`
- [x] Define the `activities` table: `id`, `lead_id`, `user_id`, `type` (`dm_sent`/`follow_up_3`/`follow_up_7`/`follow_up_14`/`reply_received`/`call_booked`/`proposal_sent`/`won`/`lost`/`note`/`status_change`), `channel`, `reply_text`, `reply_tag` (`interested`/`question`/`not_now`/`not_interested`/`other`), `note`, `occurred_at`, `created_at`.
- [x] Define `settings` (single row): `timezone` (default `Asia/Karachi`), `daily_new_leads_target` (20), `daily_messages_target` (15), `follow_up_days` (default `[3,7,14]`), `no_reply_after_days` (14), `require_approval` (false).
- [x] Define `audit_log`: `id`, `user_id`, `action`, `entity`, `entity_id`, `details` (json), `created_at`.
- [x] Add indexes:
  - `leads(owner_id, status)`
  - `leads(next_follow_up_at)`
  - `leads(profile_url)`
  - `activities(user_id, occurred_at)`
  - `activities(lead_id, occurred_at)`
- [x] Add message-template storage (table or seeded settings JSON) for first message + day 3/7/14 for LinkedIn, WhatsApp, Facebook (needed by Phase 6 and admin editing in Phase 8).
- [x] Generate Drizzle migrations (`drizzle-kit generate`).
- [x] Write the seed script: guarantee the single `settings` row, default message templates, and optionally sample data **behind a seed flag that is off by default**.
- [x] Confirm all timestamps are stored in UTC.

### Deliverables
- Drizzle schema files, generated migrations, seed script, DB connection helper.
- Documented command: `drizzle-kit migrate` + seed.

### Exit criteria
- Migrations apply cleanly to a fresh Postgres/Neon database.
- Seed creates exactly one settings row and default templates; no fake demo clients unless explicitly enabled.
- All required indexes exist.

---

## Phase 2 — Authentication, Roles, and Access Control

**Goal:** Clerk-based auth with exactly two roles and server-enforced authorization.

### Tasks
- [x] Integrate Clerk (provider, proxy) and brand `/sign-in` and `/sign-up` pages.
- [x] Configure env-based redirect URLs (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`).
- [x] Implement admin determination: a user with the verified `ADMIN_EMAIL` becomes `admin`; everyone else becomes `employee`. No UI to create admins.
- [x] Persist role in Clerk `publicMetadata.role` and mirror it in the `users` table.
- [x] Implement `/api/webhooks/clerk` with svix signature verification; handle `user.created`, `user.updated`, `user.deleted`.
- [x] Implement first-login fallback that creates/updates the DB user and sets the role if the webhook has not run.
- [x] Protect every route with the Clerk proxy.
- [x] Enforce server-side checks in every server action and API route: get Clerk user → load DB user → verify `status = active` → verify role → query. Never rely on hidden UI.
- [x] Implement post-login redirects: admin → `/admin`, employee → `/dashboard`.
- [x] Implement the `require_approval` setting behavior: new employees get `status = pending` and see `/pending` until approved (off by default).
- [x] Implement admin deactivate/reactivate: deactivated users are blocked from the app; their data is retained.
- [x] Update `last_seen_at` on activity.
- [x] Add role/status change events to `audit_log`.

### Deliverables
- Clerk proxy, webhook route, auth/session helper, role guards, pending page.
- Sign-in/sign-up pages in brand style (visual polish continues in Phase 3).

### Exit criteria
- `ADMIN_EMAIL` user gets `admin`; any other sign-up gets `employee`.
- A `pending` employee is held on `/pending`; a `deactivated` employee cannot use the app.
- Direct calls to admin routes/actions by employees are rejected server-side.
- Webhook rejects invalid svix signatures; handles create/update/delete.

---

## Phase 3 — Design System, Brand, and App Shell

**Goal:** The premium AIVized look and fully responsive, accessible shell.

### Tasks
- [x] Implement brand tokens: primary violet `#7C3AED`, deep ink `#1B1033`, dark violet `#4C1D95`, accent clay `#BC542F`, soft tint `#F4EFFE`, border `#E4DCF5`.
- [x] Load Plus Jakarta Sans with Inter/system-sans fallback.
- [x] Implement light and dark mode with good contrast in both.
- [x] Add `/public/logo.png` usage next to the "AIVized" wordmark; use the same logo as the favicon (accept the supplied file; provide a documented placeholder path if not yet supplied).
- [x] Build the app shell: left sidebar on desktop; bottom nav or drawer on mobile; fully responsive.
- [x] Apply rounded cards, soft borders, violet buttons; reserve clay for accents and warnings.
- [x] Build distinct status chips for lead statuses and reply tags.
- [x] Build shared components: skeleton loaders, empty states with a clear next action, toast messages, confirm dialogs for deletes.
- [x] Accessibility: keyboard navigation, visible focus rings, labels on all inputs, semantic headings.
- [x] Add security headers and UI text sanitization helpers (used in later phases).

### Deliverables
- Theme tokens/config, layout components (sidebar, mobile nav), reusable UI primitives.

### Exit criteria
- Brand tokens and fonts are applied consistently.
- Light/dark modes pass contrast checks.
- Shell is usable on mobile and desktop; focus and labels are visible/correct.
- Shared loading, empty, toast, and confirm patterns exist and are reused.

---

## Phase 4 — Lead Management (CRUD, Duplicates, Detail, Bulk)

**Goal:** Full employee lead management with server-side scoping and duplicate protection.

### Tasks
- [x] Create `/leads` with a table: search, filters (status, channel, industry, country, follow-up due, date added), sorting, and **server-side pagination**.
- [x] Add lead, edit lead, and soft-delete lead (with confirm dialog). Changes save to the DB immediately and the table refreshes.
- [x] Enforce `owner_id = current user` on every employee query and mutation.
- [x] Normalize `profile_url` and implement team-wide duplicate detection:
  - match on normalized `profile_url` OR same `business_name`
  - warn the employee and show the owning employee
  - block the duplicate unless the admin allows it
- [x] Build the lead detail drawer with the full activity timeline and notes.
- [x] Implement bulk actions: change status and export selected.
- [x] Build Zod schemas and typed server actions with clear error messages for all lead writes.
- [x] Add rate limiting on lead write endpoints.
- [x] Add `audit_log` entries for deletes.

### Deliverables
- `/leads` page, lead form, detail drawer, duplicate-check service, bulk actions, server actions.

### Exit criteria
- Employee CRUD works and persists across refresh.
- Employee can never read or mutate another employee's lead.
- Duplicates are caught across the whole team and blocked by default.
- Soft deletes hide rows but retain data and audit entries.

---

## Phase 5 — Activity Logging and Follow-up Engine

**Goal:** The activity ledger and the day 0/3/7/14 automation that powers all dashboards.

### Tasks
- [x] Implement quick actions: Log first message, Log follow-up (auto-picks 3/7/14), Log reply (reply text + tag), Book call, Mark proposal sent, Mark won, Mark lost.
- [x] Each action creates an `activities` row and updates the lead's `status` and `next_follow_up_at`.
- [x] Implement follow-up logic exactly:
  - first message → `status = contacted`, `follow_up_stage = 0`, next = send date + 3 days
  - each follow-up advances the stage and sets day 7, then day 14 (from `settings.follow_up_days`)
  - after day 14 → `next_follow_up_at` empty
  - reply at any time → `status = replied`, `next_follow_up_at` empty, sequence stops
  - overdue = `next_follow_up_at < now`
- [x] Implement no-reply computation: after `no_reply_after_days` from the last message with no reply → `status = no_reply`. Compute on page load and via the cron job (Phase 10).
- [x] Support user-editable `occurred_at` on activity writes.
- [x] Enforce ownership and add rate limiting on all activity write actions.
- [x] Record relevant audit events.

### Deliverables
- Activity service, follow-up state machine utility (pure/testable), quick-action components, no-reply computation helper.

### Exit criteria
- Follow-up dates are correct for day 3/7/14 and cleared after 14 and on reply.
- Every action produces the right activity row and status transition.
- No-reply leads appear correctly for both employee and admin.

---

## Phase 6 — Employee Dashboard and Templates

**Goal:** The employee's personal analytics and the outreach template library.

### Tasks
- [x] Build `/dashboard` with date range filter: Today, Yesterday, 7 days, 30 days, custom.
- [x] KPI cards: messages sent (first + follow-ups), new leads added, replies received, reply rate, calls booked, proposals sent, clients won.
- [x] Target progress bars: today's messages and new leads vs. daily targets.
- [x] Follow-ups due list: due today and overdue, with one-click "mark follow-up sent".
- [x] Charts: messages sent per day (bar), replies per day (line), channel breakdown, funnel from contacted to won.
- [x] No-reply list (per the configured threshold).
- [x] Recent activity feed.
- [x] Use SQL aggregate queries (no loading all rows into the browser).
- [x] Build `/templates`: read-only copy buttons for first message + day 3/7/14 follow-ups across LinkedIn, WhatsApp, Facebook.
- [x] Fill `[Name]` and `[Business]` placeholders from a chosen lead before copying.
- [x] Prepare template edit capability for the admin (surfaced in Phase 8).

### Deliverables
- `/dashboard` with filters, KPIs, charts, lists; `/templates` with lead-aware copy.

### Exit criteria
- Dashboard shows only the signed-in employee's numbers.
- Changing the date range updates every card and chart.
- Templates copy correctly with placeholders filled from the selected lead.

---

## Phase 7 — Admin Dashboard and Team Management

**Goal:** Team-wide visibility and management for the single admin.

### Tasks
- [x] Build `/admin` with date range filter and optional employee filter.
- [x] Team KPI cards: messages sent, new leads, replies, reply rate, calls booked, proposals, won.
- [x] Messages per employee per day: stacked bar chart **and** table (rows = employees, columns = days).
- [x] Employee performance table: messages, new leads, replies, reply rate, calls booked, won, leads with no reply, overdue follow-ups, last active; sortable; highlight below-target and no-activity-today employees.
- [x] Leaderboard for the selected period.
- [x] Channel performance: messages, replies, reply rate for LinkedIn, WhatsApp, Facebook.
- [x] Industry and service performance: industries/services with the most replies.
- [x] Team funnel.
- [x] Build `/admin/replies`:
  - Replies tab: client, business, channel, employee, date, reply text, tag; filters by employee, channel, tag, date.
  - No-reply tab: employee, channel, last message date, follow-up stage, days since contact; filters/sorting; reassign or send-back-for-follow-up button.
- [x] Build `/admin/employees`: list (name, email, status, leads count, last active); approve, deactivate, reactivate; open an employee's full dashboard and leads in read-only view plus their activity log.
- [x] Build `/admin/leads`: team-wide table with owner filter; edit, delete, reassign (single + bulk), and allow a duplicate.
- [x] Use SQL aggregates for all metrics; enforce admin-only server checks on every action/route.
- [x] Audit reassignments and admin edits/deletes.

### Deliverables
- `/admin`, `/admin/replies`, `/admin/employees`, `/admin/leads` with all sub-features and admin-scoped actions.

### Exit criteria
- Admin sees messages per employee per day, replies, no-replies, and performance; can open any employee's view.
- Admin can approve/deactivate/reactivate and reassign leads (single/bulk).
- Non-admins are rejected server-side from every admin route/action.

---

## Phase 8 — Settings, Audit Log, and Template Editing

**Goal:** Central configuration and accountability.

### Tasks
- [x] Build `/admin/settings`: time zone, daily targets, follow-up days, no-reply days, approval switch, and message-template editing (all channels/follow-up stages).
- [x] Persist settings validation with Zod; apply changes to dashboards and follow-up logic.
- [x] Build the audit-log viewer (deletes, role/status changes, imports, exports, reassignments).
- [x] Add "export all data" entry point (JSON workspace backup; full Excel export completed in Phase 9).
- [x] Ensure settings changes and template edits are audited where appropriate.

### Deliverables
- `/admin/settings` page, settings actions, audit-log UI.

### Exit criteria
- Admin can change all settings and templates; changes take effect in dashboards/follow-ups.
- Audit log records the required event types.

---

## Phase 9 — Excel/CSV Import and Export

**Goal:** Robust data portability with styling, previews, and duplicate handling.

### Tasks
- [x] Employee export: `.xlsx` with **Leads** and **Activities** sheets (own data only).
- [x] Admin export: **Leads**, **Activities**, **Replies**, and **Employee Summary** (daily messages per employee).
- [x] Excel styling: violet header row, frozen header, auto filters, column widths, date formats, status cell colors.
- [x] Import: upload `.xlsx` or `.csv` → map columns → preview first 20 rows with errors highlighted → import.
- [x] Run the team-wide duplicate check during import.
- [x] Show result summary: created, skipped, failed rows; allow downloading failed rows.
- [x] Provide a downloadable import template with correct headers and dropdowns for status and channel.
- [x] Rate-limit the import endpoint; audit imports/exports.
- [x] All processing in memory/DB — no local file persistence.

### Deliverables
- Export service (ExcelJS), import pipeline (ExcelJS + CSV parser), template generator, import/export UI.

### Exit criteria
- Exports open correctly in Excel with styling and the right sheets.
- Import preview, validation, duplicate handling, result summary, and failed-row download work.
- Import template has correct headers and dropdowns.

---

## Phase 10 — Security Hardening, Webhook, Cron, and API Completeness

**Goal:** Close all security, operational, and scheduled-job requirements.

### Tasks
- [x] Confirm secrets stay in environment variables; no keys committed.
- [x] Add/verify security headers.
- [x] Sanitize all user text shown back in the UI.
- [x] Ensure server logs contain no personal data.
- [x] Apply rate limiting to all write endpoints and the import endpoint.
- [x] Finalize `/api/webhooks/clerk` (svix verification; create/update/delete).
- [x] Implement `/api/cron/daily` secured by `CRON_SECRET`; update `no_reply` statuses.
- [x] Configure the cron schedule in `vercel.json`.
- [x] Audit coverage for deletes, role/status changes, imports, exports, reassignments.
- [x] Add the privacy/legal note page/notice (users must follow privacy and messaging laws of the countries they contact).

### Deliverables
- Hardened headers, sanitization, rate limiting, cron route + config, privacy notice.

### Exit criteria
- Cron is protected and updates no-reply statuses.
- Webhook and cron work in deployment conditions.
- Security and privacy requirements from section 11 are all satisfied.

---

## Phase 11 — Tests, QA, and Acceptance

**Goal:** Prove the critical rules and pass the acceptance checklist.

### Tasks
- [x] Unit-test follow-up logic (day 3/7/14 progression, clearing after 14, reply stopping the sequence, overdue, no-reply threshold).
- [x] Unit/integration-test duplicate detection (normalized URL and business name, team-wide).
- [x] Integration-test dashboard aggregate queries (employee scoping, admin per-employee per-day, date ranges).
- [x] Security tests proving an employee cannot read/change another employee's data or open admin routes (including direct API/action calls).
- [x] Test role assignment (`ADMIN_EMAIL` → admin, others → employee), approval gate, and deactivation.
- [x] Test import/export round-trip and failed-row reporting.
- [x] Manually verify responsiveness, dark mode, and accessibility (keyboard/focus/labels).
- [x] Run the full section-15 acceptance checklist and record results.

### Deliverables
- Test suites for role rules, follow-up logic, and dashboard queries; QA/acceptance results.

### Exit criteria
- All automated tests pass.
- Every section-15 acceptance item is verified.

---

## Phase 12 — Documentation and Deployment Readiness

**Goal:** Ship-ready repository and guides.

### Tasks
- [x] Finalize `README.md` with setup, architecture, commands, and sensible-default notes.
- [x] Include deployment steps:
  1. Create GitHub repo and import into Vercel.
  2. Add Neon Postgres from the Vercel Marketplace; set `DATABASE_URL` and optionally the direct `DATABASE_URL_UNPOOLED`.
  3. Create a Clerk app, enable email sign-in, copy keys, and add a webhook to `https://YOUR-DOMAIN/api/webhooks/clerk` for user events.
  4. Add all environment variables in Vercel, including `CRON_SECRET`.
  5. Deploy; `npm run vercel-build` applies migrations, seeds missing settings/templates, then builds.
  6. Sign up with the `ADMIN_EMAIL` address to become admin.
  7. Invite employees to the sign-up page; they are auto-approved unless approval is enabled.
- [x] Write the short admin guide and employee guide.
- [x] Verify deliverables: schema + migrations, seed, `.env.example`, `vercel.json` with cron, tests, README.
- [x] Confirm no fake demo clients (sample data only behind an off-by-default seed flag).
- [x] Final production build verified locally; Vercel deploy smoke test is documented for a credentialed deployment (no local file writes).

### Deliverables
- Complete README, admin/employee guides, production build verified locally (Vercel smoke test documented for credentialed deployment).

### Exit criteria
- A new deployer can go from clone to working app using only the README.
- All section-16 deliverables are present.

---

## Traceability Matrix — Original Requirements → Phases

| Original section | Covered in |
|---|---|
| 1. Role and goal (complete code, README, no TODOs, note choices) | Phases 0, 12; all phases |
| 2. Tech stack (Next.js, TS, Tailwind, shadcn, Clerk, Neon/Postgres, Drizzle, Zod, Recharts, ExcelJS/CSV, svix, date-fns/TZ, Vercel no local writes) | Phase 0 (install), Phases 1, 2, 3, 6, 9, 10 |
| 3. Brand and look (tokens, font, dark mode, logo/favicon, nav, components, a11y) | Phase 3 (with usage in 4–8) |
| 4. Roles and accounts (admin env email, employee default, publicMetadata + mirror, webhook + first-login fallback, approval switch, deactivate/reactivate, proxy + server checks, redirects) | Phase 2 |
| 5. Data model (users, leads, activities, settings, audit_log, indexes, UTC, timezone) | Phase 1 |
| 6. Employee features (dashboard, leads, templates, owner_id enforcement) | Phases 4, 5, 6 |
| 7. Follow-up logic (day 3/7/14, clearing, no_reply, reply stops, overdue) | Phase 5 (also Phases 6, 10) |
| 8. Admin features (dashboard, replies/no-replies, employees, all leads, settings) | Phases 7, 8 |
| 9. Excel import and export (sheets, styling, import preview/errors, template) | Phase 9 |
| 10. API and server code (Zod, auth sequence, SQL aggregates, rate limiting, webhook, cron) | Phases 2, 4, 5, 7, 10 |
| 11. Security and privacy (secrets, server checks + tests, soft delete + audit, privacy note, headers/sanitize, no PII logs) | Phases 4, 10, 11 |
| 12. Pages and routes (all 10 routes/roles) | Phases 2 (`/sign-in`, `/sign-up`, `/pending`), 6 (`/dashboard`, `/leads`, `/templates`), 7 (`/admin`, `/admin/replies`, `/admin/employees`, `/admin/leads`), 8 (`/admin/settings`) |
| 13. Environment variables (.env.example) | Phase 0 (consumed in 1, 2, 10) |
| 14. Deployment steps (README) | Phase 12 |
| 15. Acceptance checklist | Phase 11 (verified), supported by all phases |
| 16. Deliverables (source, schema/migrations/seed/.env.example/vercel.json, tests, README, no fake demo data) | Phases 0–12 |

### Section 15 Acceptance Items → Phase

| Acceptance item | Verified in |
|---|---|
| Normal sign-up → employee; `ADMIN_EMAIL` → admin | Phase 11 (built in Phase 2) |
| Employee add/edit/delete leads; persists across refresh | Phase 11 (built in Phase 4) |
| First message/follow-up creates activity, updates status + day 3/7/14 dates | Phase 11 (built in Phase 5) |
| Reply stops sequence and appears in admin replies feed with text | Phase 11 (built in Phases 5, 7) |
| No-reply leads appear for employee and admin after set days | Phase 11 (built in Phases 5, 6, 7, 10) |
| Employee dashboard shows only own numbers; date range updates all | Phase 11 (built in Phase 6) |
| Admin dashboard shows per-employee-per-day messages, replies, no-replies, performance; can open any employee view | Phase 11 (built in Phase 7) |
| Employee cannot open admin pages or read others' data via direct API calls; automated tests | Phase 11 (built in Phases 2, 4, 7) |
| Duplicate leads caught across the team | Phase 11 (built in Phases 4, 9) |
| Excel export opens with styling; import preview + error report | Phase 11 (built in Phase 9) |
| Works on mobile, dark mode, deploys on Vercel with no local writes | Phase 11 (built in Phases 3, 9, 10, 12) |

---

## Dependency Order (Critical Path)

```
Phase 0 → Phase 1 → Phase 2 → Phase 3
                         └→ Phase 4 → Phase 5 → Phase 6
                                              └→ Phase 7 → Phase 8 → Phase 9
                                                                 └→ Phase 10 → Phase 11 → Phase 12
```

- Phases 4–6 can partially parallelize once Phases 1–2 are stable.
- Phase 7 depends on Phase 5 (activity data) and Phase 4 (lead model).
- Phase 8 depends on Phase 7 (admin shell) and Phase 1 (settings/templates).
- Phase 9 depends on Phases 4–8 (data + UI surfaces).
- Phases 10–12 are the hardening, verification, and release gates and must come last.
