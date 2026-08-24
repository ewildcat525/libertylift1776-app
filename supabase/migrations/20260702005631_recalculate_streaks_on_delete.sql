-- Recompute streaks in recalculate_user_stats.
--
-- This function runs via the delete trigger when a user clears a day, but it
-- preserved current_streak (unless the user had no logs left) and never
-- touched longest_streak. Logging a future-dated day and then deleting it
-- therefore left an inflated streak behind (e.g. a "3 day streak" on July 1).
-- Derive both streaks from the log days that actually remain.
CREATE OR REPLACE FUNCTION public.recalculate_user_stats(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_total integer;
  v_best_day integer;
  v_days_logged integer;
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
BEGIN
  SELECT
    coalesce(sum(daily.daily_total), 0),
    coalesce(max(daily.daily_total), 0),
    count(distinct daily.log_date)
  INTO v_total, v_best_day, v_days_logged
  FROM (
    SELECT date(logged_at) AS log_date, sum(pushup_logs.count) AS daily_total
    FROM public.pushup_logs
    WHERE pushup_logs.user_id = p_user_id
    GROUP BY date(logged_at)
  ) daily;

  SELECT date(max(logged_at)) INTO v_last_date
  FROM public.pushup_logs
  WHERE user_id = p_user_id;

  -- Group distinct log days into consecutive runs. The current streak is the
  -- run ending on the most recent log day, matching the insert trigger.
  WITH days AS (
    SELECT DISTINCT date(logged_at) AS log_date
    FROM public.pushup_logs
    WHERE user_id = p_user_id
  ),
  runs AS (
    SELECT log_date,
           log_date - (row_number() OVER (ORDER BY log_date))::integer AS run_id
    FROM days
  ),
  streaks AS (
    SELECT count(*) AS len, max(log_date) AS run_end
    FROM runs
    GROUP BY run_id
  )
  SELECT
    coalesce(max(len) FILTER (WHERE run_end = v_last_date), 0),
    coalesce(max(len), 0)
  INTO v_current_streak, v_longest_streak
  FROM streaks;

  UPDATE public.user_stats SET
    total_pushups = v_total,
    best_day = v_best_day,
    days_logged = v_days_logged,
    last_log_date = v_last_date,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
