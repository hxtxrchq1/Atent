-- Web Push cannot run a continuous audio file in a suspended iOS PWA.
-- Deliver discrete iOS system notifications every 10 seconds while active.
CREATE OR REPLACE FUNCTION public.claim_due_ios_web_push_reminders(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(alert_id UUID, recipient_user_id UUID, repeat_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT r.alert_id, r.recipient_user_id
      FROM public.ios_web_push_reminders r
     WHERE r.acknowledged_at IS NULL AND r.stopped_at IS NULL AND r.next_attempt_at <= now()
     ORDER BY r.next_attempt_at
     FOR UPDATE SKIP LOCKED
     LIMIT least(greatest(coalesce(p_limit, 100), 1), 200)
  )
  UPDATE public.ios_web_push_reminders r
     SET repeat_count = r.repeat_count + 1,
         next_attempt_at = now() + interval '10 seconds'
    FROM due
   WHERE r.alert_id = due.alert_id AND r.recipient_user_id = due.recipient_user_id
  RETURNING r.alert_id, r.recipient_user_id, r.repeat_count;
END;
$$;

DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'atent-ios-repeat-web-push' LIMIT 1;
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
END;
$$;

SELECT cron.schedule(
  'atent-ios-repeat-web-push',
  '10 seconds',
  $cron$
    SELECT net.http_post(
      url := 'https://ngsexidmirortoccbatd.supabase.co/functions/v1/send-emergency-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'atent_edge_function_service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('type', 'RETRY_ACTIVE_IOS_PUSH'),
      timeout_milliseconds := 10000
    );
  $cron$
);

UPDATE public.ios_web_push_reminders
   SET next_attempt_at = now() + interval '10 seconds'
 WHERE acknowledged_at IS NULL AND stopped_at IS NULL;
