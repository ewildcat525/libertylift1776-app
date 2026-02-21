-- Function to recalculate stats (can be called after delete)
CREATE OR REPLACE FUNCTION public.recalculate_user_stats(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_total integer;
  v_best_day integer;
  v_days_logged integer;
  v_last_date date;
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

  UPDATE public.user_stats SET
    total_pushups = v_total,
    best_day = v_best_day,
    days_logged = v_days_logged,
    last_log_date = v_last_date,
    current_streak = CASE WHEN v_total = 0 THEN 0 ELSE current_streak END,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for delete
CREATE OR REPLACE FUNCTION public.on_pushup_delete()
RETURNS trigger AS $$
BEGIN
  PERFORM public.recalculate_user_stats(OLD.user_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the delete trigger
DROP TRIGGER IF EXISTS on_pushup_log_delete ON public.pushup_logs;
CREATE TRIGGER on_pushup_log_delete
  AFTER DELETE ON public.pushup_logs
  FOR EACH ROW EXECUTE FUNCTION public.on_pushup_delete();
