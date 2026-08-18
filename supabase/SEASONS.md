# Running a season

`public.challenge_seasons` is the source of truth for everything about a given
July: the goal, the caps, the logging window, the Final Push window and the
closing bell. The app reads it, the database enforces it, and any client — web
or native — gets it from the `current_season()` RPC.

## The two questions

There are two different "current seasons" and mixing them up breaks the
offseason:

| Function | Answers | Today (August 2026) |
| --- | --- | --- |
| `season_for_logging()` | which season a rep written now belongs to | 2027 |
| `season_for_display()` | which season the boards show | 2026 |

Display stays on the finished season until the next one's `starts_on` arrives,
so the Hall of Honor, the leaderboards and the records keep standing all
offseason. `seasonForDisplay()` / `seasonForLogging()` in `src/lib/seasons.ts`
mirror these exactly.

## Opening 2027

The 2027 row already exists with `status = 'interest'`, which means no rep can
be logged against it. Nothing else has to change to open it:

```sql
-- registration: people can enlist, still no reps
update public.challenge_seasons set status = 'registration' where year = 2027;

-- live: reps are accepted, inside the logging window
update public.challenge_seasons set status = 'live' where year = 2027;
```

Writes are accepted only when the status is `registration` or `live` **and**
`now()` is inside `[logging_opens_at, logging_closes_at)`. Both guards have to
agree, so flipping the status early cannot accidentally open logging in April.

## Closing a season

```sql
update public.challenge_seasons set status = 'closed' where year = 2027;
```

Past `logging_closes_at` the window has already closed on its own; setting
`closed` makes it permanent and explicit. This is what keeps 2026 frozen — the
old hardcoded freeze trigger was replaced by the same check reading this row.

## Adding 2028

```sql
insert into public.challenge_seasons (
  year, name, starts_on, ends_on, status,
  goal, daily_cap, per_log_cap, time_zone,
  logging_opens_at, logging_closes_at,
  final_push_on, final_push_opens_at, final_push_deadline
) values (
  2028, 'Liberty Lift 1776 — 2028', date '2028-07-01', date '2028-07-31', 'interest',
  1776, 500, 1000, 'America/New_York',
  timestamptz '2028-06-30 00:00:00+00', timestamptz '2028-08-02 10:00:00+00',
  date '2028-07-31', timestamptz '2028-07-31 04:00:00+00', timestamptz '2028-08-01 10:00:00+00'
);
```

Then add the matching entry to `SEASONS` in `src/lib/seasons.ts`. The mirror
only drives countdowns and copy in the web bundle; the database still decides
what is accepted, so a stale mirror shows a wrong clock, never wrong data.

Logging windows must not overlap — a deferred constraint trigger enforces it,
because `season_for_log_date()` has to resolve exactly one season per rep.

## Milestones

`community_milestones` is per season now. 2027 opens with no milestone rows, so
the nationwide bells do not ring until you decide what they are and insert them
with `season_year = 2027`.

## Writing reps

Clients call `log_pushups(p_count, p_logged_on, p_notes, p_client_log_id)`
rather than inserting into `pushup_logs`. The RPC stamps the timestamp at noon
in the season's timezone, enforces the daily and per-entry caps, rejects a day
outside the season, and treats a repeated `p_client_log_id` as the same rep —
which is what makes an offline queue on the phone safe to replay.

`clear_pushups_for_day(p_day)` is the matching delete.
