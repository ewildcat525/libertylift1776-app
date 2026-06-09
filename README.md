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
- Charity pledge setup for Wounded Warrior Project or Save the Children
- Supabase-backed profiles, logs, stats, achievements, contests, pledges, and email subscribers
- Public shareable profile pages (`/p/[handle]`) with dynamic Open Graph cards
- Share buttons (native share sheet, X, copy link) after logging, at milestones, and on state boards
- Referral tracking: `?ref=<handle>` links credit recruiters, shown as "patriots recruited" on the dashboard
- Dynamic per-state Open Graph images and metadata for state boards and contest invites
- Pre-launch email capture on the landing page with live "patriots enlisted" social proof
- Sitemap, robots rules, PWA manifest, and Vercel Analytics funnel events
- Daily reminder emails during July (launch blast + pace/streak nudges) via Vercel Cron and Resend
- Top Recruiters leaderboard tab and Founding Patriot badges for pre-July signups
- Spread-the-word page (`/spread-the-word`) with copy-paste captions and the #LibertyLift1776 hashtag
- Landing page state board flips from preview data to live totals once reps are logged

## Email Reminders

A Vercel Cron job (`vercel.json`) hits `/api/cron/reminders` daily at 13:00 UTC. During
July 2026 it sends a launch announcement to the pre-launch email list (July 1) and a
personalized pace/streak reminder to participants who have not logged that day. Every
email carries an HMAC-signed one-click unsubscribe link.

Required environment variables: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`EMAIL_FROM`, and `CRON_SECRET` (see `.env.local.example`). The route is a no-op until
they are configured, and outside the July 2026 window.

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
