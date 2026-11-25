-- Repeat the iOS PWA's system push alert until the recipient opens Alertas
-- or the emergency ends. This does not run audio in the PWA background.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;

CREATE TABLE IF NOT EXISTS public.ios_web_push_reminders (
  alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repeat_count INTEGER NOT NULL DEFAULT 0 CHECK (repeat_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ios_web_push_reminders_due
  ON public.ios_web_push_reminders(next_attempt_at)
  WHERE acknowledged_at IS NULL AND stopped_at IS NULL;

ALTER TABLE public.ios_web_push_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ios_web_push_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ios_web_push_reminders TO service_role;

CREATE OR REPLACE FUNCTION public.acknowledge_ios_web_push_alerts_session(
  p_session_token TEXT,
  p_alert_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID;
  v_updated INTEGER;
BEGIN
  SELECT user_id INTO v_user_id FROM public.pwa_sessions
   WHERE token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
     AND revoked_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Web session expired; sign in again'; END IF;
  UPDATE public.ios_web_push_reminders
     SET acknowledged_at = now(), stopped_at = now()
   WHERE recipient_user_id = v_user_id
     AND alert_id = ANY(coalesce(p_alert_ids, ARRAY[]::UUID[]))
     AND acknowledged_at IS NULL AND stopped_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

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
         next_attempt_at = now() + CASE WHEN r.repeat_count + 1 < 5
           THEN interval '1 minute' ELSE interval '5 minutes' END
    FROM due
   WHERE r.alert_id = due.alert_id AND r.recipient_user_id = due.recipient_user_id
  RETURNING r.alert_id, r.recipient_user_id, r.repeat_count;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_ios_web_push_alerts_session(TEXT, UUID[]) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_ios_web_push_reminders(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_ios_web_push_alerts_session(TEXT, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_due_ios_web_push_reminders(INTEGER) TO service_role;

SELECT cron.schedule(
  'atent-ios-repeat-web-push',
  '* * * * *',
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
