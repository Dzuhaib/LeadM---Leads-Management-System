# AIVized Lead Tracker: Full Build Prompt

Paste everything below the line into your AI coding tool (Claude Code, Cursor or similar). It describes a complete team lead tracker with Clerk login, an admin dashboard, employee dashboards and Excel import and export, ready to deploy on Vercel.

## 1. Role and goal

You are a senior full-stack engineer. Build a production-ready web app called AIVized Lead Tracker, a team tool for finding clients through LinkedIn, WhatsApp and Facebook outreach.

The team sends first messages and follow-ups on day 3, day 7 and day 14. The app must let every employee log their work, and let one admin see how much work each employee did each day, which clients replied, and which clients did not reply.

Deliver complete, working code with a README. Do not leave placeholders or TODOs in core features. Ask me a question only if something blocks you; otherwise make a sensible choice and note it in the README.

## 2. Tech stack (use exactly this)

- Next.js (latest stable, App Router) with TypeScript
- Tailwind CSS and shadcn/ui components
- Clerk for sign-up, login and sessions
- PostgreSQL (Neon via the Vercel Marketplace) with Drizzle ORM and Drizzle migrations
- Zod for all input validation
- Recharts for charts
- ExcelJS for Excel export and import (.xlsx), plus CSV import
- svix to verify Clerk webhooks
- date-fns and date-fns-tz for dates and time zones
- Deploy target: Vercel. Do not write to the local file system, because Vercel's file system is not persistent. All data lives in Postgres. Excel is for export and import only.

## 3. Brand and look

Premium, clean and professional, matching the AIVized company profile.

| Token | Value |
|---|---|
| Primary violet | #7C3AED |
| Deep ink | #1B1033 |
| Dark violet | #4C1D95 |
| Accent clay | #BC542F |
| Soft tint | #F4EFFE |
| Border | #E4DCF5 |

- Font: Plus Jakarta Sans (fallback Inter, system sans-serif).
- Light and dark mode, both with good contrast.
- Logo: a small icon file at /public/logo.png (I will supply it) next to the text "AIVized". Use the same logo as the favicon.
- Left sidebar on desktop, bottom or drawer navigation on mobile. Fully responsive.
- Rounded cards, soft borders, violet buttons, clay used only for accents and warnings.
- Status chips with distinct colors. Skeleton loaders, empty states with a clear next action, toast messages, and confirm dialogs for deletes.
- Accessible: keyboard navigation, visible focus, labels on all inputs.

## 4. Roles and accounts (Clerk)

- There are exactly two roles: admin and employee.
- Admin: one person. Their email is set in the environment variable ADMIN_EMAIL. When a user with that verified email signs up or signs in, they become admin. There is no screen to create more admins.
- Employee: anyone else who registers becomes an employee automatically.
- Store the role in Clerk publicMetadata.role and mirror it in the users table. Set it with a Clerk user.created webhook (verify the svix signature) and also on first login as a fallback.
- Add a setting "Require admin approval for new employees" (off by default). When on, new employees see a "Waiting for approval" screen until the admin approves them.
- The admin can deactivate or reactivate an employee. Deactivated users cannot use the app. Their data stays.
- Protect every route with Clerk middleware. Every server action and API route must also check the role on the server. Never rely on hidden buttons.
- Redirect after login: admin goes to /admin, employee goes to /dashboard.

## 5. Data model

All timestamps are stored in UTC. Day boundaries ("today", "this week") use the app time zone from settings, default Asia/Karachi.

### users

| Column | Notes |
|---|---|
| id | uuid, primary key |
| clerk_id | unique |
| email, full_name, avatar_url | |
| role | admin or employee |
| status | active, pending, deactivated |
| last_seen_at | updated on activity |
| created_at | |

### leads

| Column | Notes |
|---|---|
| id | uuid |
| owner_id | references users (the employee who owns the lead) |
| contact_name, business_name | business name required |
| job_title, industry, country | |
| channel | linkedin, whatsapp, facebook, other |
| source | e.g. LinkedIn search, Google Maps, job post, referral, event |
| profile_url | normalized, used for duplicate checks |
| email, phone | optional |
| observation | the real detail used in the first message |
| service_pitched | AI Systems, Automations, SEO & GEO, Digital Marketing, Web Development, Desktop Software, other |
| status | new, contacted, replied, call_booked, proposal_sent, won, lost, no_reply |
| next_follow_up_at | computed, see section 7 |
| follow_up_stage | 0 to 3 (day 0, 3, 7, 14 sent) |
| notes | text |
| deleted_at | soft delete |
| created_at, updated_at | |

### activities (every action is a row, and this is what the dashboards count)

| Column | Notes |
|---|---|
| id | uuid |
| lead_id, user_id | |
| type | dm_sent, follow_up_3, follow_up_7, follow_up_14, reply_received, call_booked, proposal_sent, won, lost, note, status_change |
| channel | |
| reply_text | what the client said, for reply_received |
| reply_tag | interested, question, not_now, not_interested, other |
| note | |
| occurred_at | user-editable, default now |
| created_at | |

### settings (single row)

| Column | Notes |
|---|---|
| timezone | default Asia/Karachi |
| daily_new_leads_target, daily_messages_target | defaults 20 and 15 |
| follow_up_days | default [3, 7, 14] |
| no_reply_after_days | default 14 after the last message |
| require_approval | boolean, default false |

### audit_log

id, user_id, action, entity, entity_id, details (json), created_at. Record deletes, role or status changes, imports, exports and reassignments.

Add indexes on leads(owner_id, status), leads(next_follow_up_at), leads(profile_url), and activities(user_id, occurred_at), activities(lead_id, occurred_at).

## 6. Employee features (/dashboard, /leads, /templates)

An employee only sees and changes their own leads and activities. Enforce this on the server by filtering on owner_id.

### Employee dashboard (/dashboard)

- Date range filter: Today, Yesterday, 7 days, 30 days, custom.
- KPI cards: messages sent (first messages plus follow-ups), new leads added, replies received, reply rate, calls booked, proposals sent, clients won.
- Target progress: today's messages and new leads against the daily targets, shown as progress bars.
- Follow-ups due: a list of leads due today and overdue, with a one-click button to mark the follow-up as sent.
- Charts: messages sent per day (bar), replies per day (line), channel breakdown, funnel from contacted to won.
- No-reply list: leads with no reply after the set number of days.
- Recent activity feed.

### Leads page (/leads)

- Table with search, filters (status, channel, industry, country, follow-up due, date added), sorting and server-side pagination.
- Add lead, edit lead and delete lead (soft delete with confirm) from the page. Changes save to the database immediately and the table refreshes.
- Duplicate check on add and import: if the normalized profile_url or the same business name already exists in the whole team, warn the employee and show who owns it. Block the duplicate unless the admin allows it.
- Quick actions on each row: Log first message, Log follow-up (the app picks 3, 7 or 14 automatically), Log reply (with reply text and tag), Book call, Mark proposal sent, Mark won, Mark lost. Each action creates an activities row and updates the lead status and next_follow_up_at.
- Lead detail drawer with the full activity timeline and notes.
- Bulk actions: change status, export selected.
- Import from Excel or CSV, and Export to Excel (see section 9).

### Templates page (/templates)

- Read-only copy buttons for the outreach messages (first message and day 3, 7 and 14 follow-ups for LinkedIn, WhatsApp and Facebook). Placeholders like [Name] and [Business] are filled from a chosen lead before copying. The admin can edit the template text.

## 7. Follow-up logic

- When the first message is logged: status = contacted, follow_up_stage = 0, and next_follow_up_at is the send date plus 3 days.
- Each follow-up logged moves the stage forward and sets the next date (day 7, then day 14). Dates come from settings.follow_up_days.
- After the day 14 follow-up, next_follow_up_at is empty.
- If the lead has had no reply for no_reply_after_days after the last message, set status = no_reply (run this in a daily Vercel Cron job and also compute it when pages load).
- When a reply is logged at any time, stop the sequence: status = replied, next_follow_up_at is empty.
- Overdue means next_follow_up_at is before now.

## 8. Admin features (/admin/*)

Only the admin can open these pages. The admin can also open any employee's view.

### Overall dashboard (/admin)

- Date range filter and optional employee filter.
- Team KPI cards: messages sent, new leads, replies, reply rate, calls booked, proposals, won.
- Messages per employee per day: a stacked bar chart plus a table (rows are employees, columns are days) so the admin sees how many DMs each person sent each day.
- Employee performance table: messages sent, new leads, replies, reply rate, calls booked, won, leads with no reply, overdue follow-ups, last active time. Sortable. Highlight employees below the daily target and employees with no activity today.
- Leaderboard for the selected period.
- Channel performance: messages, replies and reply rate for LinkedIn, WhatsApp and Facebook.
- Industry and service performance: which industries and services get the most replies.
- Funnel for the whole team.

### Replies and no-replies (/admin/replies)

- Replies tab: a feed of every client reply with client, business, channel, employee, date, the reply text and the tag (interested, question, not now, not interested). Filters by employee, channel, tag and date.
- No reply tab: every lead that has not replied, with the employee, channel, last message date, follow-up stage and days since contact. Filters and sorting. Button to reassign or send back to the employee for a follow-up.

### Employees (/admin/employees)

- List with name, email, status, leads count, last active time.
- Approve, deactivate or reactivate an employee.
- Click an employee to open their full dashboard and leads in read-only view, plus their activity log.

### All leads (/admin/leads)

- Same table as employees, but across the whole team with an owner filter. The admin can edit, delete, reassign leads to another employee (single or bulk) and allow a duplicate.

### Settings (/admin/settings)

- Time zone, daily targets, follow-up days, no-reply days, approval switch, and the edit page for message templates.
- Export all data and view the audit log.

## 9. Excel import and export

- Export (employee, own data): an .xlsx with a Leads sheet and an Activities sheet.
- Export (admin, all data): Leads, Activities, Replies, and an Employee Summary sheet with daily messages per employee.
- Excel styling: violet header row, frozen header, auto filters, column widths, date formats, and status cell colors.
- Import: upload .xlsx or .csv, map columns, preview the first 20 rows with errors highlighted, then import. Run the duplicate check. Show a result summary with created, skipped and failed rows, and let the user download the failed rows.
- Provide a downloadable import template with the right headers and a dropdown for status and channel.

## 10. API and server code

- Use Server Actions or route handlers, validated with Zod. Return typed results and clear error messages.
- Every handler starts with: get Clerk user, load the DB user, check status is active, check role, then query. Employees' queries always include owner_id = current user.
- Dashboard numbers come from SQL aggregate queries on activities, not from loading all rows into the browser.
- Add rate limiting on write endpoints and the import endpoint.
- Webhook route /api/webhooks/clerk: verify svix signature, handle user.created, user.updated and user.deleted.
- Cron route /api/cron/daily: secured with CRON_SECRET, updates no_reply statuses. Configure it in vercel.json.

## 11. Security and privacy

- All secrets live in environment variables. Never commit keys.
- Server-side role checks on every route. Add tests proving an employee cannot read or change another employee's data or open admin routes.
- Soft delete leads, and keep deletes in the audit log.
- Store only the client data needed for outreach. Add a page note that users must follow the privacy and messaging laws of the countries they contact.
- Add security headers and sanitize any text shown back in the UI.
- Do not log personal data in server logs.

## 12. Pages and routes

| Route | Who | Purpose |
|---|---|---|
| /sign-in, /sign-up | public | Clerk pages in the brand style |
| /pending | employee | Waiting for approval |
| /dashboard | employee | Own dashboard |
| /leads | employee | Own leads |
| /templates | employee | Message templates |
| /admin | admin | Team dashboard |
| /admin/replies | admin | Replies and no-replies |
| /admin/employees | admin | Employees and their views |
| /admin/leads | admin | All leads |
| /admin/settings | admin | Settings, audit log, exports |

## 13. Environment variables (.env.example)

- DATABASE_URL
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL
- CLERK_WEBHOOK_SECRET
- ADMIN_EMAIL
- CRON_SECRET
- APP_TIMEZONE (default Asia/Karachi)

## 14. Deployment steps (put these in the README)

1. Create the project on GitHub and import it into Vercel.
2. Add a Neon Postgres database from the Vercel Marketplace and copy DATABASE_URL.
3. Create a Clerk application, enable email sign-in, copy the keys, and add a webhook to https://YOUR-DOMAIN/api/webhooks/clerk for user events.
4. Add all environment variables in Vercel.
5. Run migrations (drizzle-kit migrate) and the seed script that creates the settings row and default templates.
6. Sign up with the ADMIN_EMAIL address to become the admin.
7. Invite employees to the sign-up page.

## 15. Acceptance checklist

The build is done when all of these pass:

- A new user who signs up with a normal email becomes an employee. The ADMIN_EMAIL user becomes the admin.
- An employee can add, edit and delete leads, and the table updates right away and keeps the change after refresh.
- Logging a first message or follow-up creates an activity, updates the status and sets the next follow-up date correctly (day 3, 7, 14).
- Logging a reply stops the sequence and shows in the admin replies feed with the reply text.
- Leads with no reply after the set days show as no reply for the employee and the admin.
- The employee dashboard shows only that employee's numbers. Changing the date range updates every card and chart.
- The admin dashboard shows messages per employee per day, replies, no-replies and employee performance, and the admin can open any employee's view.
- An employee cannot open admin pages or read another employee's data, even by calling the API directly. Automated tests cover this.
- Duplicate leads are caught across the team.
- Excel export opens correctly in Excel with styling, and import works with the preview and error report.
- The app works on mobile, in dark mode, and deploys on Vercel with no local file writes.

## 16. Deliverables

- Full source code in a clean folder structure with comments only where needed.
- Drizzle schema and migrations, seed script, .env.example, vercel.json with the cron job.
- Tests for the role rules, follow-up logic and dashboard queries.
- A README with setup, deployment steps and a short admin and employee guide.
- Do not add fake demo clients unless I ask. If you add sample data, put it behind a seed flag that is off by default.
