# Liberty Lift 1776

Liberty Lift 1776 is a Next.js campaign app for a July 1-31, 2026 push-up challenge. Participants join a state, log progress toward 1776 push-ups, climb personal and national leaderboards, create private contests, and optionally make honor-system charity pledges based on their performance.

## Features

- Public campaign landing page with countdown, challenge explanation, and state competition preview
- Supabase authentication with email magic links and Google OAuth
- State-based signup flow with generated public display handles
- Authenticated dashboard for logging July 2026 push-ups
- Personal stats, calendar tracking, cumulative progress chart, and milestone messages
- Global leaderboard with total, streak, and best-day rankings
- Private and public contests with invite codes
- Nationwide chat page (`/chat`) with live updates, @mentions with autocomplete, and a notification bell for call-outs (open to all signed-in participants; access is gated by `canUseChat` in `src/lib/flags.ts` and `public.can_use_chat()` if it ever needs to be re-limited)
- Charity pledge setup: donate a fixed rate per push-up completed to Wounded Warrior Project
- Supabase-backed profiles, logs, stats, achievements, contests, pledges, and email subscribers
- Public shareable profile pages (`/p/[handle]`) with dynamic Open Graph cards
- Share buttons (native share sheet, X, copy link) after logging, at milestones, and on state boards
- Referral tracking: `?ref=<handle>` links credit recruiters, shown as "patriots recruited" on the dashboard
- Dynamic per-state Open Graph images and metadata for state boards and contest invites
- Live "patriots enlisted" social proof counter on the landing page
- Sitemap, robots rules, PWA manifest, and Vercel Analytics funnel events
- Daily reminder emails during July (launch blast + pace/streak nudges) via Vercel Cron and Resend
- Top Recruiters leaderboard tab and Founding Father badges for pre-July signups
- Spread-the-word page (`/spread-the-word`) with copy-paste captions and the #LibertyLift1776 hashtag
- Landing page state board flips from preview data to live totals once reps are logged
- Nationwide push-up counter with community milestones (50k, 100k, 177,600, 239,000, 252,757): the patriot whose rep crosses the line earns a one-of-a-kind badge, and everyone gets a shared celebration banner on the dashboard and leaderboard. The 50k and 100k milestones fire fireworks; the 177,600 summit (1,776 × 100) plays an animated Iwo Jima-style flag raising; 239,000 (one push-up per mile to the moon) plays a lunar flag plant beside the Eagle; 252,757 (one mile farther than Artemis II flew from Earth in April 2026, past the farthest any human has ever traveled) plays an animated Orion "Earthset," the crescent Earth setting behind the Moon's far-side limb
- The Final Push: a last-day blitz on July 31 — the biggest single-day total logged on the 31st crowns the Final Push Champion, honored in the Hall of Honor. A banner on the dashboard and leaderboard hypes it during July, becomes a live top-10 day board on the 31st (`final_push_board` view, bucketed to US Eastern), and shows results on August 1; the leaderboard also gains a 🔥 Final Push tab with the full ranked day board (teaser before the day, and the default tab on the 31st); a one-time announcement email goes out July 30 (idempotent via `profiles.final_push_emailed_at`, day-of retry on the 31st)
- The Final Push War Room (`/final-push`): the last day lived rather than refreshed. A clock counting down to the closing bell that escalates the whole page through `steady → closing → final-hour → bell`, the national day count ticking up as reps land, an inline log box with `+25/+50/+100` presets so nobody has to leave to answer a rival, the chase number ("312 more to pass X", or "to crack the top 25" once you are below the loaded board), a board that reorders with ▲/▼ movement and a "you just got passed" alert, a live tape of every set landing across the country, and the final-day state battle with a pound-for-pound average. Liveness comes from a Supabase realtime subscription to `pushup_logs` inserts, debounced into an authoritative refetch (ranks and ties are decided in SQL), with a 25s poll as a backstop where realtime cannot connect. The page has four phases from `finalPushPhase()` — the eve (countdown plus the biggest single day anyone has posted all month), the live room, the frozen results, and a hand-off to the Hall of Honor — re-derived every second, so a room left open closes itself instead of sitting there wearing live badges. Backed by `final_push_pulse`, `final_push_state_board`, and `final_push_feed` views
- The closing bell: the Final Push is a live contest, so it closes live at **one national instant** — midnight ending July 31 in Hawaii, the last US timezone to reach it (`FINAL_PUSH_DEADLINE`, 2026-08-01T10:00Z, which is 6:00am ET on August 1; Alaska is on AKDT in July and gets there two hours earlier, so Hawaii decides it). Everyone in the country watches the same clock hit zero. Unlike the rest of the challenge the crown does **not** wait for the grace day: past the bell the `final_push_*` views ignore anything logged after it (`created_at < deadline`), so late July 31 reps still count toward 1,776, your state and the national total but cannot rewrite who won the last day. When the clock reaches zero the room waits three seconds for in-flight reps, re-reads the now-frozen board, and only then fires the fireworks naming the champion — with ties sharing the crown — rather than crowning whatever was cached on screen. Same midnight-in-Hawaii convention as the books freeze in `20260727120000_close_the_books.sql`, exactly one day earlier
- Post-contest finale, phase-gated by `challengePhase()` in `src/lib/dates.ts`: August 1 is a one-day grace period ("last call" banners; July reps can still be logged), after which a database trigger freezes all `pushup_logs` writes (2026-08-02T10:00:00Z — midnight Hawaii) so the live views become the certified final standings. From August 1 the Hall of Honor (`/finale`) opens: final nationwide count, champions' podium (national top 3, longest streak, best day, top recruiter, with ties as co-champions), state battle results with a pound-for-pound award, the one-of-a-kind milestone wall with replayable celebration animations, the 1,776 finishers' roll, total pledged to Wounded Warrior Project with a fulfillment CTA, the "earned, not given" merch CTA, a thank-you message, and a "see you in 2027" email list (reuses `email_subscribers` with `source: finale_2027`). The dashboard swaps the logging card for a personal after-action report (final rank, share buttons, merch CTA), the leaderboard gets a FINAL seal and ranks longest streak once current streaks expire, and the landing page and nav flip to results mode

## Email Reminders

A Vercel Cron job (`vercel.json`) hits `/api/cron/reminders` daily at 13:00 UTC. During
July 2026 it sends a launch announcement to the pre-launch email list (July 1) and a
weekly (Mondays, July only) personalized pace/streak reminder to participants who have
not logged that day. On July 30 it sends the one-time Final Push announcement (with
day-of copy for anyone retried on the 31st). On August 2 it sends a one-time finale blast — personal after-action
stats, the final national count, the Hall of Honor link, plus the merch CTA for finishers
and a pledge-fulfillment nudge for pledgers — idempotent via `profiles.finale_emailed_at`,
with retry headroom through August 4. Every email carries an HMAC-signed one-click
unsubscribe link.

Required environment variables: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`EMAIL_FROM`, and `CRON_SECRET` (see `.env.local.example`). The route is a no-op until
they are configured, and outside the July 1 – August 4, 2026 window.

Set `EMAIL_TEST_RECIPIENT` to a single address to enable a protected delivery check at
`POST /api/email/test`. It requires `Authorization: Bearer <CRON_SECRET>` and never
sends to the campaign mailing list. Add `?type=final-push` or `?type=finale` to send
the corresponding production template with representative test stats.

## Tech Stack

- [Next.js](https://nextjs.org/) 14 App Router
- [React](https://react.dev/) 18
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) Auth and Postgres
- [Recharts](https://recharts.org/) for dashboard charts
- [Framer Motion](https://www.framer.com/motion/) for UI animation support

## Getting Started

### Prerequisites

- Node.js 18.17 or newer
- npm
- A Supabase project

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

You can find the Supabase values in your Supabase project under **Project Settings > API**.
Set `NEXT_PUBLIC_SITE_URL` to your production domain when deploying; it is used for
canonical metadata, Open Graph URLs, and the sitemap.

### Set Up Supabase

The database schema lives in:

- `supabase-schema.sql`
- `supabase/migrations/*.sql`

For a fresh Supabase project, run `supabase-schema.sql` first in the Supabase SQL Editor, then run the migration files in chronological order:

1. `supabase/migrations/20260220_add_delete_trigger.sql`
2. `supabase/migrations/20260221_add_pledges.sql`
3. `supabase/migrations/20260314_email_subscribers.sql`
4. `supabase/migrations/20260608_signup_profile_metadata.sql`
5. `supabase/migrations/20260609014525_join_private_contest_by_invite_code.sql`
6. `supabase/migrations/20260609120000_allow_private_contest_members_to_read_contests.sql`
7. `supabase/migrations/20260609130000_unique_profile_display_names.sql`
8. `supabase/migrations/20260609180000_viral_growth_and_hardening.sql`
9. `supabase/migrations/20260610090000_email_privacy_and_retention.sql`
10. `supabase/migrations/20260610150000_fix_daily_cap_update_bypass.sql`
11. `supabase/migrations/20260615100000_single_charity_single_pledge_type.sql`

The schema enables Row Level Security and creates the core tables, triggers, functions, and leaderboard view used by the app.

### Configure Authentication

In Supabase Auth settings:

- Enable email magic links.
- Enable Google OAuth if you want the Google signup button to work.
- Add your local site URL, usually `http://localhost:3000`.
- Add redirect URLs for:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
```

For production, add the same callback paths for your deployed domain.

The branded magic-link email lives in:

- `supabase/templates/magic-link.subject.txt`
- `supabase/templates/magic-link.html`

For hosted Supabase, update the live template in **Authentication > Email Templates > Magic Link**:

- Subject: paste the contents of `supabase/templates/magic-link.subject.txt`
- Body: paste the contents of `supabase/templates/magic-link.html`

You can also update it through the Supabase Management API with:

- `mailer_subjects_magic_link`
- `mailer_templates_magic_link_content`

Supabase template edits in this repo are not automatically deployed to hosted projects. Supabase may require a paid plan or custom SMTP for template customization on newer free-tier projects.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Runs the production build locally.

```bash
npm run lint
```

Runs the Next.js lint command.

## App Routes

- `/` - Campaign landing page
- `/signup` - Signup flow with state selection
- `/login` - Sign-in page
- `/auth/callback` - Supabase OAuth and magic-link callback
- `/auth/confirm` - Auth confirmation page
- `/dashboard` - Authenticated push-up logging dashboard
- `/leaderboard` - Global leaderboard
- `/final-push` - The Final Push War Room: the live last-day blitz on July 31
- `/chat` - Nationwide chat with @mentions
- `/states` - State competition view
- `/contests` - Contest discovery, creation, and invite-code joining
- `/contests/[id]` - Individual contest page
- `/p/[handle]` - Public shareable profile page with dynamic OG card
- `/join/[code]` - Contest invite landing page
- `/pledge` - Charity pledge setup
- `/pledge/leaderboard` - Pledge leaderboard
- `/privacy`, `/terms` - Legal pages

## Project Structure

```text
public/
  favicon.svg
  og-image.svg
  liberty-lift-pushup-loop.mp4
src/
  app/                  Next.js App Router pages and route handlers
  components/           Shared UI components
  lib/                  Supabase client, constants, and onboarding helpers
  middleware.ts         Supabase session middleware
supabase/
  migrations/           Incremental database migrations
supabase-schema.sql     Base database schema
```

## Challenge Rules

The challenge is designed around completing 1776 push-ups during July 2026. The dashboard accepts logs dated from July 1 through July 31, 2026 and uses a daily pace target of 58 push-ups per day.

## Deployment

This app is ready to deploy on Vercel or any platform that supports Next.js.

Before deploying:

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the hosting provider.
2. Add your production domain to Supabase Auth site URL and redirect URLs.
3. Run the Supabase schema and migrations in the production Supabase project.
4. Build the app with `npm run build`.

## Notes

- Pledges are honor-system only. The app does not collect or process payments.
- Leaderboard data is derived from Supabase tables and views.
- User sessions use Supabase SSR cookies with the `libertylift-auth` cookie name.
